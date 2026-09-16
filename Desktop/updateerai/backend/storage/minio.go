package storage

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinioClient struct {
	Client     *minio.Client
	BucketName string
	Endpoint   string
}

func InitMinio() *MinioClient {
	endpoint := os.Getenv("MINIO_ENDPOINT")
	if endpoint == "" {
		endpoint = "minio:9000" // Default to docker service name
	}
	accessKey := os.Getenv("MINIO_ROOT_USER")
	if accessKey == "" {
		accessKey = "admin"
	}
	secretKey := os.Getenv("MINIO_ROOT_PASSWORD")
	if secretKey == "" {
		log.Fatal("MINIO_ROOT_PASSWORD environment variable is required")
	}
	bucketName := os.Getenv("MINIO_BUCKET_NAME")
	if bucketName == "" {
		bucketName = "browser"
	}

	// S3 Override for Cloudflare Tunnel
	useSSL := false
	// if os.Getenv("S3_USE_SSL") == "true" {
	// 	useSSL = true
	// }

	// If S3_ENDPOINT is set, we prefer that for the client connection
	// (assuming we are running outside the mesh or need public DNS resolution)
	// HOWEVER, for internal docker communication, we usually stick to "minio:9000"
	// The user request specifically asks for S3_ENDPOINT to be used.
	// if s3Endpoint := os.Getenv("S3_ENDPOINT"); s3Endpoint != "" {
	// 	endpoint = s3Endpoint
	// }

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL, // Set to true if using HTTPS/SSL
	})
	if err != nil {
		log.Printf("Failed to initialize MinIO client: %v", err)
		return nil
	}

	// Create bucket if it doesn't exist
	var errBucket error
	for i := 0; i < 30; i++ {
		errBucket = client.MakeBucket(context.Background(), bucketName, minio.MakeBucketOptions{})
		if errBucket == nil {
			log.Printf("Successfully created %s\n", bucketName)
		} else {
			// Check if bucket already exists
			exists, errBucketExists := client.BucketExists(context.Background(), bucketName)
			if errBucketExists == nil && exists {
				log.Printf("We already own %s\n", bucketName)
			} else {
				log.Printf("MinIO not ready yet, retrying... (%d/30): %v", i+1, errBucket)
				time.Sleep(1 * time.Second)
				continue
			}
		}

		// Bucket exists or was created, now set policy
		// Set bucket policy to public read (optional, but good for logos)
		policy := fmt.Sprintf(`{"Version": "2012-10-17","Statement": [{"Action": ["s3:GetObject"],"Effect": "Allow","Principal": {"AWS": ["*"]},"Resource": ["arn:aws:s3:::%s/*"]}]}`, bucketName)
		err = client.SetBucketPolicy(context.Background(), bucketName, policy)
		if err != nil {
			log.Printf("Failed to set bucket policy: %v", err)
		} else {
			log.Printf("Successfully set public policy for bucket %s", bucketName)
		}

		// ALSO set policy for 'browser' bucket if it exists (fixing user error)
		existsBrowser, errBrowser := client.BucketExists(context.Background(), "browser")
		if errBrowser == nil && existsBrowser {
			policyBrowser := `{"Version": "2012-10-17","Statement": [{"Action": ["s3:GetObject"],"Effect": "Allow","Principal": {"AWS": ["*"]},"Resource": ["arn:aws:s3:::browser/*"]}]}`
			err = client.SetBucketPolicy(context.Background(), "browser", policyBrowser)
			if err != nil {
				log.Printf("Failed to set bucket policy for browser: %v", err)
			} else {
				log.Printf("Successfully set public policy for bucket browser")
			}
		}

		return &MinioClient{Client: client, BucketName: bucketName, Endpoint: endpoint}
	}

	log.Printf("Failed to connect to MinIO after retries: %v", errBucket)
	return nil
}

func (m *MinioClient) UploadFile(filename string, data []byte, contentType string) (string, error) {
	return m.UploadFileStream(filename, bytes.NewReader(data), int64(len(data)), contentType)
}

func (m *MinioClient) UploadFileStream(filename string, reader io.Reader, size int64, contentType string) (string, error) {
	ctx := context.Background()

	// Upload the file to MinIO
	_, err := m.Client.PutObject(ctx, m.BucketName, filename, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})

	if err != nil {
		return "", err
	}

	// Construct URL
	// We need to return the URL relative to the bucket or full URL
	// Ideally full URL if we have public host
	return filename, nil
}

func (m *MinioClient) UploadImage(base64Data string, folder string) (string, error) {
	// 1. Parse base64
	parts := strings.Split(base64Data, ",")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid base64 data")
	}

	// Extract content type
	// data:image/png;base64
	meta := strings.Split(parts[0], ";")[0] // data:image/png
	if !strings.Contains(meta, ":") {
		return "", fmt.Errorf("invalid base64 meta")
	}
	mimeType := strings.Split(meta, ":")[1]

	ext := "png"
	if strings.Contains(mimeType, "jpeg") || strings.Contains(mimeType, "jpg") {
		ext = "jpg"
	} else if strings.Contains(mimeType, "gif") {
		ext = "gif"
	}

	data, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}

	// 2. Generate filename
	filename := fmt.Sprintf("%s/%d.%s", folder, time.Now().UnixNano(), ext)

	// 3. Upload
	_, err = m.UploadFile(filename, data, mimeType)
	if err != nil {
		return "", err
	}

	// 4. Return filename (caller constructs URL)
	return filename, nil
}

func (m *MinioClient) GetFileStream(bucketName, filename string) (io.ReadCloser, string, error) {
	ctx := context.Background()
	object, err := m.Client.GetObject(ctx, bucketName, filename, minio.GetObjectOptions{})
	if err != nil {
		return nil, "", err
	}

	stat, err := object.Stat()
	if err != nil {
		return nil, "", err
	}

	return object, stat.ContentType, nil
}

func (m *MinioClient) GetFile(filename string) ([]byte, error) {
	ctx := context.Background()
	object, err := m.Client.GetObject(ctx, m.BucketName, filename, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	defer object.Close()

	return io.ReadAll(object)
}
