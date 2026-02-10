package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"backend/storage"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/resend/resend-go/v3"
	svix "github.com/svix/svix-webhooks/go"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/genai"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type User struct {
	ID           uint      `gorm:"primaryKey"`
	Email        string    `gorm:"uniqueIndex"`
	PasswordHash string
	Profile      Profile
	Domains      []UserDomain
	CreatedAt    time.Time
}

type Profile struct {
	ID               uint   `gorm:"primaryKey"`
	UserID           uint   `gorm:"uniqueIndex"`
	BrandName        string `json:"brandName"`
	BrandDescription string `json:"brandDescription"`
	LogoURL          string `json:"logoUrl"`
	FacebookURL      string `json:"facebookUrl"`
	TwitterURL       string `json:"twitterUrl"`
	LinkedinURL      string `json:"linkedinUrl"`
	PrivacyPolicyURL string `json:"privacyPolicyUrl"`
	Credits          int    `json:"credits"`
	CampaignCredits  int    `json:"campaignCredits"`
	SubscriptionTier string    `json:"subscriptionTier"`
	IsSubscribed     bool      `json:"isSubscribed"`
	SubscriptionExpiresAt *time.Time `json:"subscriptionExpiresAt"`
}

type UserDomain struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"index" json:"-"`
	DomainName string    `json:"domainName"` // Changed from Name to DomainName
	ResendID   string    `json:"resendDomainId"` // Changed from ResendID
	Status     string    `json:"status"`
	Region     string    `json:"region"`
	DNSRecords string    `gorm:"type:text" json:"dnsRecords"` // Stored as JSON string
	HasTracking bool     `json:"hasTracking"`
	CreatedAt  time.Time `json:"createdAt"`
}

func (UserDomain) TableName() string {
	return "user_domains"
}


type Contact struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"-"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Tag       string    `json:"tag"`
	CreatedAt time.Time `json:"createdAt"`
}

type SavedDesign struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"-"`
	Name      string    `json:"name"`
	HTML      string    `gorm:"type:text" json:"html"`
	CreatedAt time.Time `json:"createdAt"`
}

type SentEmail struct {
	ResendID  string    `gorm:"primaryKey" json:"resend_id"`
	UserID    uint      `gorm:"index" json:"-"`
	Status    string    `json:"status"` // e.g., "sent", "email.delivered", "email.opened", "email.clicked"
	Subject   string    `json:"subject"`
	Recipient string    `json:"recipient"`
	CreatedAt time.Time `json:"created_at"`
}

type UnsubscribedUser struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"-"` // The brand/user they unsubscribed from
	Email     string    `gorm:"index" json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

type ResendWebhookPayload struct {
	Type string `json:"type"`
	Data struct {
		EmailID string `json:"email_id"`
	} `json:"data"`
}

type App struct {
	DB *gorm.DB
	MinioClient *storage.MinioClient
}

type Subscription struct {
	ID                  uint      `gorm:"primaryKey"`
	UserID              uint      `gorm:"index"`
	Status              string    // "active", "expired", "cancelled"
	CurrentPeriodStart  time.Time
	CurrentPeriodEnd    time.Time
	RecurringInterval   string    // "month"
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type Invoice struct {
	ID             uint      `gorm:"primaryKey"`
	SubscriptionID uint      `gorm:"index"`
	UserID         uint      `gorm:"index"`
	Amount         float64
	Status         string    // "paid", "pending", "failed"
	PeriodStart    time.Time
	PeriodEnd      time.Time
	CreatedAt      time.Time
}

type jwtCustomClaims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

func main() {
	// Load .env file
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")

	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		dsn = "host=localhost user=admin password=secretpassword dbname=mail_manager port=5432 sslmode=disable"
	}

	var db *gorm.DB
	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			SkipDefaultTransaction: true,
		})
		if err == nil {
			break
		}
		time.Sleep(2 * time.Second)
		log.Println("Retrying database connection...")
	}
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	db.AutoMigrate(&User{}, &Profile{}, &Contact{}, &SavedDesign{}, &UserDomain{}, &SentEmail{}, &UnsubscribedUser{}, &Subscription{}, &Invoice{})
	
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.BodyLimit("5M")) // Allow uploads up to 5MB
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000", "https://app.updateerai.fun", "https://console.updateerai.fun"},
		AllowCredentials: true,
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept},
	}))

	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Updateer AI Backend is running")
	})

	e.GET("/health", func(c echo.Context) error {
		return c.String(http.StatusOK, "OK")
	})
    
	// Initialize MinIO
	minioClient := storage.InitMinio()
	if minioClient == nil {
		log.Println("Warning: Failed to initialize MinIO storage. File uploads will be disabled.")
	}

	app := &App{
		DB:          db,
		MinioClient: minioClient,
	}

	api := e.Group("/api/v1")
	auth := api.Group("/auth")
	auth.POST("/login", app.Login)
	auth.POST("/signup", app.Signup)
	auth.POST("/logout", app.Logout)
	api.POST("/webhook/selar", app.HandleSelarWebhook)

	api.GET("/profile", app.RequireAuth(app.GetProfile))
	api.PATCH("/profile", app.RequireAuth(app.UpdateProfile))
	api.POST("/generate", app.RequireAuth(app.GenerateEmail))

	api.GET("/contacts", app.RequireAuth(app.GetContacts))
	api.POST("/contacts", app.RequireAuth(app.AddContact))
	api.PATCH("/contacts/:id", app.RequireAuth(app.UpdateContact))
	api.POST("/contacts/import", app.RequireAuth(app.ImportContacts))
	api.DELETE("/contacts/:id", app.RequireAuth(app.DeleteContact))

	api.GET("/designs", app.RequireAuth(app.GetDesigns))
	api.GET("/designs/:id", app.RequireAuth(app.GetDesign))
	api.POST("/designs", app.RequireAuth(app.SaveDesign))
	api.DELETE("/designs/:id", app.RequireAuth(app.DeleteDesign))

	// File Upload
	api.POST("/upload", app.RequireAuth(app.UploadFile))
	
	// Image Proxy (Public or Auth?) - Public for email clients
	api.GET("/images/:bucket/:filename", app.HandleGetImage)

	// Domain Management
	api.GET("/domains", app.RequireAuth(app.ListDomains))
	api.POST("/domains", app.RequireAuth(app.RegisterDomain))
	api.GET("/domains/:id", app.RequireAuth(app.GetDomainStatus))
	api.POST("/domains/:id/verify", app.RequireAuth(app.VerifyDomain))
	api.DELETE("/domains/:id", app.RequireAuth(app.DeleteDomain))

	// Email Sending
	api.POST("/send", app.RequireAuth(app.SendEmail))

	// Unsubscribe Handlers (Public)
	api.GET("/unsubscribe", app.HandleUnsubscribe)
	api.POST("/unsubscribe", app.HandleUnsubscribeOneClick)

	// Webhooks
	api.POST("/webhooks/resend", app.HandleResendWebhook)

	// Analytics
	api.GET("/analytics/summary", app.RequireAuth(app.GetAnalyticsSummary))
	api.GET("/analytics/performance", app.RequireAuth(app.GetAnalyticsPerformance))

	api.GET("/admin/credit", app.AdminCreditUser)
	api.GET("/admin/users", app.AdminListUsers) // New endpoint for listing users
	api.GET("/admin/user", app.AdminGetUser) // New endpoint
	api.GET("/admin/reset-password", app.AdminResetPassword)
	api.POST("/admin/webhook/init", app.InitResendWebhook)

	// Auto-register webhook on startup
	go func() {
		// Wait for server to start
		time.Sleep(5 * time.Second)
		app.AutoRegisterWebhook()
	}()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	s := &http.Server{
		Addr:         ":" + port,
		ReadTimeout:  20 * time.Minute,
		WriteTimeout: 20 * time.Minute,
		IdleTimeout:  120 * time.Second, // Help Cloudflare keep the pipe open
	}
	e.Logger.Fatal(e.StartServer(s))
}

func (a *App) AutoRegisterWebhook() {
	apiKey := os.Getenv("RESEND_API_KEY")
	appUrl := os.Getenv("APP_URL")

	if apiKey == "" || appUrl == "" {
		fmt.Println("Skipping auto-webhook registration: RESEND_API_KEY or APP_URL not set")
		return
	}

	appUrl = strings.TrimSuffix(appUrl, "/")
	webhookEndpoint := appUrl + "/api/v1/webhooks/resend"

	client := resend.NewClient(apiKey)

	existingWebhooks, err := client.Webhooks.List()
	if err != nil {
		fmt.Printf("Failed to list webhooks: %v\n", err)
		return
	}

	for _, wh := range existingWebhooks.Data {
		if wh.Endpoint == webhookEndpoint {
			fmt.Printf("Webhook already registered: %s\n", webhookEndpoint)
			return
		}
	}

	fmt.Printf("Registering new webhook for: %s\n", webhookEndpoint)
	
	params := &resend.CreateWebhookRequest{
		Endpoint: webhookEndpoint,
		Events: []string{
			"email.sent",
			"email.delivered",
			"email.opened",
			"email.clicked",
			"email.bounced",
			"email.complained",
		},
	}

	webhook, err := client.Webhooks.Create(params)
	if err != nil {
		fmt.Printf("Failed to auto-create webhook: %v\n", err)
	} else {
		fmt.Printf("Successfully auto-created webhook: %s (ID: %s)\n", webhookEndpoint, webhook.Id)
	}
}

func (a *App) Login(c echo.Context) error {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}

	var user User
	if err := a.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Invalid email or password"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Invalid email or password"})
	}

	token, err := generateToken(user.ID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to generate token"})
	}

	setCookie(c, token)
	return c.JSON(http.StatusOK, echo.Map{"message": "Logged in"})
}

func (a *App) Signup(c echo.Context) error {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to hash password"})
	}

	user := User{
		Email:        input.Email,
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
	}
	// Initialize default profile
	user.Profile = Profile{
		Credits:          100,
		CampaignCredits:  10,
		SubscriptionTier: "Free",
	}

	if err := a.DB.Create(&user).Error; err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return c.JSON(http.StatusConflict, echo.Map{"error": "Email already exists"})
		}
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to create user"})
	}

	token, err := generateToken(user.ID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to generate token"})
	}

	setCookie(c, token)
	return c.JSON(http.StatusOK, echo.Map{"message": "Signed up"})
}

func (a *App) Logout(c echo.Context) error {
	setCookie(c, "")
	return c.JSON(http.StatusOK, echo.Map{"message": "Logged out"})
}

func (a *App) GetProfile(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var user User
	if err := a.DB.Preload("Profile").First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "User not found"})
	}

	res := map[string]interface{}{
		"email":            user.Email,
		"brandName":        user.Profile.BrandName,
		"brandDescription": user.Profile.BrandDescription,
		"logoUrl":          user.Profile.LogoURL,
		"facebookUrl":      user.Profile.FacebookURL,
		"twitterUrl":       user.Profile.TwitterURL,
		"linkedinUrl":      user.Profile.LinkedinURL,
		"privacyPolicyUrl": user.Profile.PrivacyPolicyURL,
		"credits":          user.Profile.Credits,
		"campaignCredits":  user.Profile.CampaignCredits,
		"subscriptionTier": user.Profile.SubscriptionTier,
		"isSubscribed":     user.Profile.IsSubscribed,
	}
	return c.JSON(http.StatusOK, res)
}

func (a *App) UpdateProfile(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var input Profile
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}
	input.UserID = userID

	// Intercept Base64 Logo and Upload to MinIO
	if input.LogoURL != "" && strings.HasPrefix(input.LogoURL, "data:") {
		// Expect format: data:image/png;base64,.....
		parts := strings.Split(input.LogoURL, ",")
		if len(parts) == 2 {
			meta := parts[0] // e.g., data:image/png;base64
			data := parts[1]

			// Extract extension
			ext := ".png" // default
			if strings.Contains(meta, "image/jpeg") {
				ext = ".jpg"
			} else if strings.Contains(meta, "image/gif") {
				ext = ".gif"
			} else if strings.Contains(meta, "image/svg+xml") {
				ext = ".svg"
			}

			decoded, err := base64.StdEncoding.DecodeString(data)
			if err == nil {
				// Use initialized MinIO client
				if a.MinioClient != nil {
					filename := fmt.Sprintf("logo-%d-%d%s", userID, time.Now().Unix(), ext)
					contentType := strings.TrimSuffix(strings.TrimPrefix(meta, "data:"), ";base64")
					
					url, err := a.MinioClient.UploadFile(filename, decoded, contentType)
					if err == nil {
						fmt.Printf("Successfully uploaded logo to MinIO: %s\n", url)
						input.LogoURL = url
					} else {
						fmt.Printf("Failed to upload to MinIO: %v. Falling back to base64 storage.\n", err)
					}
				} else {
					fmt.Println("MinIO not configured. Falling back to base64 storage.")
				}
			}
		}
	}

	result := a.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		UpdateAll: true,
	}).Create(&input)

	if result.Error != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to update profile"})
	}

	return c.JSON(http.StatusOK, input)
}

func (a *App) RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		cookie, err := c.Cookie("auth_token")
		if err != nil {
			return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Missing token"})
		}

		token, err := jwt.ParseWithClaims(cookie.Value, &jwtCustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Invalid token"})
		}

		claims := token.Claims.(*jwtCustomClaims)
		c.Set("user_id", claims.UserID)

		// Fetch User and Profile for Access Control
		var user User
		if err := a.DB.Preload("Profile").First(&user, claims.UserID).Error; err == nil {
			profile := user.Profile
			
			// 1. Subscription Status Check
			if profile.IsSubscribed && profile.SubscriptionExpiresAt != nil && time.Now().After(*profile.SubscriptionExpiresAt) {
				log.Printf("Subscription expired for user %d. Downgrading...", user.ID)
				
				// Downgrade Profile
				profile.IsSubscribed = false
				profile.SubscriptionTier = "Free"
				if err := a.DB.Save(&profile).Error; err != nil {
					log.Printf("Failed to update expired profile for user %d: %v", user.ID, err)
				}

				// Mark Subscription as Expired
				var sub Subscription
				if err := a.DB.Where("user_id = ? AND status = ?", user.ID, "active").First(&sub).Error; err == nil {
					sub.Status = "expired"
					a.DB.Save(&sub)
				}
			}

			isSubscribed := profile.IsSubscribed

			// 2. Free Trial Logic (Credit-Based)
			// User is in "Free Trial" mode ONLY IF:
			// - They have not subscribed (checked above)
			// - They have not purchased extra credits (Credits <= 100 && CampaignCredits <= 10)
			// - They have not exhausted their initial credits (Credits > 0)
			// - They have not historically used up the trial (TotalEmailsSent < 100)
			
			var totalSent int64
			a.DB.Model(&SentEmail{}).Where("user_id = ?", claims.UserID).Count(&totalSent)

			hasTopUp := profile.Credits > 100 || profile.CampaignCredits > 10
			trialExhausted := profile.Credits <= 0 || totalSent >= 100
			
			inFreeTrial := !hasTopUp && !trialExhausted

			// STRICT ACCESS RULE: Must be Subscribed OR in Free Trial
			if !isSubscribed && !inFreeTrial {
				// Allow access to Profile/Billing endpoints so they can subscribe
				allowedPaths := []string{"/api/v1/profile", "/api/v1/auth/logout"}
				isAllowed := false
				for _, p := range allowedPaths {
					if c.Path() == p {
						isAllowed = true
						break
					}
				}

				if !isAllowed {
					return c.JSON(http.StatusForbidden, echo.Map{
						"error":   "SUBSCRIPTION_REQUIRED",
						"message": "Your free trial has ended. Please subscribe to a monthly plan to continue using your dashboard.",
					})
				}
			}
		}

		return next(c)
	}
}

func generateToken(userID uint) (string, error) {
	claims := &jwtCustomClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "replace-this-in-prod"
	}
	return token.SignedString([]byte(secret))
}

func setCookie(c echo.Context, token string) {
	cookie := new(http.Cookie)
	cookie.Name = "auth_token"
	cookie.Value = token
	cookie.Expires = time.Now().Add(72 * time.Hour)
	cookie.HttpOnly = true
	cookie.Path = "/"
	c.SetCookie(cookie)
}

func (a *App) constructPublicURL(c echo.Context, filename, bucket string) string {
	s3Endpoint := os.Getenv("S3_ENDPOINT")
	s3UseSSL := os.Getenv("S3_USE_SSL") == "true"

	if s3Endpoint != "" {
		scheme := "http"
		if s3UseSSL {
			scheme = "https"
		}
		// If s3Endpoint doesn't start with scheme, add it
		if !strings.HasPrefix(s3Endpoint, "http") {
			s3Endpoint = fmt.Sprintf("%s://%s", scheme, s3Endpoint)
		}
		s3Endpoint = strings.TrimRight(s3Endpoint, "/")

		// Handle filename that might already contain bucket prefix (e.g. "logos/img.png")
		cleanFilename := strings.TrimPrefix(filename, bucket+"/")
		
		// Return direct S3 URL: https://logos.updateerai.fun/logos/img.png
		return fmt.Sprintf("%s/%s/%s", s3Endpoint, bucket, cleanFilename)
	}

	// Fallback to Proxy via App
	scheme := "https"
	if c.Request().TLS == nil && c.Request().Header.Get("X-Forwarded-Proto") == "http" {
		scheme = "http"
	}
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = fmt.Sprintf("%s://%s", scheme, c.Request().Host)
	}
	appURL = strings.TrimSuffix(appURL, "/")

	cleanFilename := strings.TrimPrefix(filename, bucket+"/")
	return fmt.Sprintf("%s/api/v1/images/%s/%s", appURL, bucket, cleanFilename)
}

func (a *App) GenerateEmail(c echo.Context) error {
	type ProductImage struct {
		ID   string `json:"id"`
		URL  string `json:"url"`
		Name string `json:"name"`
	}

	var config struct {
		Type             string         `json:"type"`
		BrandName        string         `json:"brandName"`
		BrandDescription string         `json:"brandDescription"`
		LogoURL          string         `json:"logoUrl"`
		CTAUrl           string         `json:"ctaUrl"`
		CTALabel         string         `json:"ctaLabel"`
		PrivacyPolicyURL string         `json:"privacyPolicyUrl"`
		FacebookURL      string         `json:"facebookUrl"`
		TwitterURL       string         `json:"twitterUrl"`
		LinkedinURL      string         `json:"linkedinUrl"`
		PrimaryGoal      string         `json:"primaryGoal"`
		AudienceProfile  string         `json:"audienceProfile"`
		BrandVoice       string         `json:"brandVoice"`
		MustHaves        string         `json:"mustHaves"`
		DesignStyle      string         `json:"designStyle"`
		Context          string         `json:"context"`
		ProductImageURL  string         `json:"productImageUrl"` // Deprecated but kept for backward compatibility
		ProductImages    []ProductImage `json:"productImages"`
	}

	if err := c.Bind(&config); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid config"})
	}

	const LOGO_PLACEHOLDER = "%%BRAND_LOGO_IMAGE_DATA%%"
	// const PRODUCT_PLACEHOLDER = "%%PRODUCT_IMAGE_DATA%%" // No longer used for multiple images

	isLogoBase64 := strings.HasPrefix(config.LogoURL, "data:")
	
	finalLogoURL := config.LogoURL
	if isLogoBase64 {
		filename, err := a.MinioClient.UploadImage(config.LogoURL, "logos")
		if err == nil {
			finalLogoURL = a.constructPublicURL(c, filename, "logos")
		} else {
			log.Printf("Failed to upload logo: %v", err)
		}
	} else if config.LogoURL != "" && !strings.HasPrefix(config.LogoURL, "http") {
		// Handle existing profile logos (filename only)
		finalLogoURL = a.constructPublicURL(c, config.LogoURL, "logos")
	}

	// Process Product Images
	var processedImages []ProductImage

	// 1. Handle Legacy Single Image (if present and no array provided)
	if len(config.ProductImages) == 0 && config.ProductImageURL != "" {
		processedImages = append(processedImages, ProductImage{
			ID:   "legacy",
			Name: "Product Image",
			URL:  config.ProductImageURL,
		})
	} else {
		processedImages = config.ProductImages
	}

	// 2. Process all images (Upload base64, construct URLs)
	var finalProductImages []ProductImage
	for _, img := range processedImages {
		finalURL := img.URL
		isBase64 := strings.HasPrefix(img.URL, "data:")

		if isBase64 {
			filename, err := a.MinioClient.UploadImage(img.URL, "products")
			if err == nil {
				finalURL = a.constructPublicURL(c, filename, "products")
			} else {
				log.Printf("Failed to upload product image %s: %v", img.Name, err)
				continue // Skip failed uploads
			}
		} else if strings.Contains(img.URL, "pulse-minio-ent") || strings.Contains(img.URL, "localhost:9000") || strings.Contains(img.URL, "minio:9000") {
			// Fix internal MinIO URLs to public URLs
			parts := strings.Split(img.URL, "/")
			if len(parts) >= 2 {
				filename := parts[len(parts)-1]
				bucket := parts[len(parts)-2]
				finalURL = a.constructPublicURL(c, filename, bucket)
			}
		} else if img.URL != "" && !strings.HasPrefix(img.URL, "http") {
			// Filename from /upload endpoint (default bucket "logos" unless moved)
			// Note: UploadFile puts everything in "logos" by default via MinioClient default bucket
			// But let's assume if it's a product image, it might be in "products" if uploaded via specific tool?
			// Actually UploadFile uses default bucket ("logos").
			bucket := "logos"
			if a.MinioClient != nil && a.MinioClient.BucketName != "" {
				bucket = a.MinioClient.BucketName
			}
			finalURL = a.constructPublicURL(c, img.URL, bucket)
		}

		finalProductImages = append(finalProductImages, ProductImage{
			ID:   img.ID,
			Name: img.Name,
			URL:  finalURL,
		})
	}

	// Construct Product Images Context for AI
	productImagesContext := ""
	if len(finalProductImages) > 0 {
		productImagesContext = "AVAILABLE PRODUCT IMAGES (Use these based on the content context):\n"
		for _, img := range finalProductImages {
			productImagesContext += fmt.Sprintf("- Image Name: \"%s\"\n  URL: %s\n", img.Name, img.URL)
		}
		productImagesContext += "INSTRUCTION: Choose the most relevant image URL from the list above based on the 'Image Name' that matches the content you are generating. If you generate content for 'Car', use the image named 'car'. DO NOT wrap the URL in backticks or quotes in the final HTML.\n"
	}

	promptLogo := finalLogoURL
	// promptProduct := finalProductURL // Removed single product logic

	modeLogic := map[string]string{
		"Newsletter":            "Structure: 3 insights, 1 question. High scannability.",
		"Welcome Message":       "Focus: Brand warmth, community value. First onboarding step.",
		"Product Advertisement": fmt.Sprintf(`Focus: Conversion. Persuasive copy. Triggers: Urgency/FOMO.
    IMAGE SIZING RULES:
    - Hero Image Width: 600-650px. Height: 300-500px.
    - Product Grid: 2-col (300px wide) or 3-col (200px wide).
    - Thumbnails: 150-200px square.
    - Retina Display: Ensure images are high-res (2x display size) but optimized file size (<200KB).
    - Total Email Size: Keep HTML + Images < 102KB.`),
		"Transactional":         "Focus: Precision. Order details. Tracking or support info.",
	}

	ctaInstruction := ""
	if config.CTAUrl != "" {
		ctaInstruction = fmt.Sprintf(`STRICT CTA RULE: 
    - You MUST include exactly ONE Call-to-Action (CTA) button. 
    - This button MUST be positioned AFTER the main email message content and BEFORE the footer. 
    - Use the label "%s" and link "%s" for this single button.
    - DO NOT generate any other buttons or links in the body. Only this one is allowed.`, config.CTALabel, config.CTAUrl)
	} else {
		ctaInstruction = `STRICT CTA RULE:
    - ABSOLUTELY NO BUTTONS OR LINKS allowed in the main content.
    - Do NOT include "Read More", "Get Started", or any other call-to-action.
    - The email must be purely informational.
    - If you include a button or link, the system will reject the output.`
	}

	prompt := fmt.Sprintf(`
    TASK: Generate %s for "%s".
    BRAND ABOUT: %s
    DESIGN: STRICT BLACK ON WHITE. Bg:#FFFFFF, Text:#000000, Buttons:Black/WhiteText. No gradients.
    
    %s
    %s

    STRICT CONTENT RULES (DO NOT IGNORE):
    1. UNSUBSCRIBE: Do NOT include any "Unsubscribe" link or text in the email body or footer. This is handled by email headers.
    2. PRIVACY POLICY: Do NOT include any "Privacy Policy" link or text.
    3. FOOTER: The ONLY allowed links in the footer are the brand's social media links (if provided).
    4. SOURCE OF TRUTH: You must generate content based ONLY on the provided "CORE CONTEXT" and "MARKETING CONTEXT". Do not hallucinate, invent facts, or include outside information not explicitly given.

    MOBILE OPTIMIZATION:
    - Ensure the design is mobile-first as 50%%+ of opens are on mobile.

    TONE REQUIREMENT:
    - The brand voice MUST be human, empathetic, and conversational by default.
    - Avoid robotic, overly formal, or generic corporate jargon.
    
    CORE CONTEXT (Specific to this email):
    """
    %s
    """

    MARKETING CONTEXT:
    - Primary Goal: %s
    - Audience Profile: %s
    - Brand Voice: %s
    - Must-Haves: %s
    - Style: %s
    
    MODE RULES: %s
    
    ASSETS:
    - Logo: %s
    - Socials (Only include if provided): FB:%s, TW:%s, LI:%s
    
    SOCIAL MEDIA DISPLAY RULES:
    - Do NOT use icons or images for social media links.
    - Use simple text links (e.g., "Facebook", "Twitter", "LinkedIn").
    - Style them as small, subtle text links in the footer.

    OUTPUT: Valid HTML + React Email (Tailwind). Mobile-responsive.
    IMPORTANT: If you see placeholders like %s, use them exactly as the src for <img> tags.
    `, config.Type, config.BrandName, config.BrandDescription,
		ctaInstruction,
		productImagesContext,
		config.Context,
		config.PrimaryGoal, config.AudienceProfile, config.BrandVoice, config.MustHaves, config.DesignStyle,
		modeLogic[config.Type],
		promptLogo,
		orDefault(config.FacebookURL, "None"), orDefault(config.TwitterURL, "None"), orDefault(config.LinkedinURL, "None"),
		LOGO_PLACEHOLDER)

	ctx := c.Request().Context()

	// Check for Vertex AI config first
	project := os.Getenv("GOOGLE_CLOUD_PROJECT")
	location := os.Getenv("GOOGLE_CLOUD_LOCATION")
	apiKey := os.Getenv("GEMINI_API_KEY")

	var client *genai.Client
	var err error

	if project != "" && location != "" {
		// Use Vertex AI
		client, err = genai.NewClient(ctx, &genai.ClientConfig{
			Backend:  genai.BackendVertexAI,
			Project:  project,
			Location: location,
		})
	} else if apiKey != "" {
		// Use Gemini API
		client, err = genai.NewClient(ctx, &genai.ClientConfig{
			Backend: genai.BackendGeminiAPI,
			APIKey:  apiKey,
		})
	} else {
		client, err = genai.NewClient(ctx, &genai.ClientConfig{
			Backend: genai.BackendGeminiAPI,
		})
	}

	if err != nil {
		log.Printf("Failed to init genai client: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "failed to init ai client: " + err.Error()})
	}

	modelName := os.Getenv("GEMINI_MODEL")
	if modelName == "" {
		modelName = "gemini-2.5-flash"
	}

	iter := client.Models.GenerateContentStream(ctx, modelName, genai.Text(prompt), &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseSchema: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"html":      {Type: genai.TypeString},
				"reactCode": {Type: genai.TypeString},
				"metadata": {
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"subjectLine":       {Type: genai.TypeString},
						"category":          {Type: genai.TypeString},
						"estimatedReadTime": {Type: genai.TypeInteger},
					},
					Required: []string{"subjectLine", "category", "estimatedReadTime"},
				},
			},
			Required: []string{"html", "reactCode", "metadata"},
		},
	})

	c.Response().Header().Set(echo.HeaderContentType, "text/event-stream")
	c.Response().Header().Set(echo.HeaderCacheControl, "no-cache")
	c.Response().Header().Set(echo.HeaderConnection, "keep-alive")
	c.Response().WriteHeader(http.StatusOK)

	for resp, err := range iter {
		if err != nil {
			log.Printf("Stream error: %v", err)
			break
		}
		if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
			text := resp.Candidates[0].Content.Parts[0].Text
			if _, err := c.Response().Writer.Write([]byte(text)); err != nil {
				return nil
			}
			c.Response().Flush()
		}
	}

	return nil
}

type SelarWebhookPayload struct {
	ProductID     string `json:"product_id"`
	ProductName   string `json:"product_name"`
	Product       string `json:"product"`        // Fallback for flat JSON
	Status        string `json:"status"`
	Customer      struct {
		Email string `json:"email"`
	} `json:"customer"`
	Email         string `json:"email"`          // Fallback for flat JSON
	CustomerEmail string `json:"customer_email"` // Fallback for flat JSON
	CustomerEmailDouble string `json:"customer__email"` // Fallback for Zapier flat format
}

func (a *App) HandleSelarWebhook(c echo.Context) error {
	payload := new(SelarWebhookPayload)
	if err := c.Bind(payload); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid payload"})
	}

	// Resolve Email
	email := payload.Customer.Email
	if email == "" {
		email = payload.Email
	}
	if email == "" {
		email = payload.CustomerEmail
	}
	if email == "" {
		email = payload.CustomerEmailDouble
	}

	// Resolve Product Name
	pName := payload.ProductName
	if pName == "" {
		pName = payload.Product
	}

	// Log payload for debugging
	fmt.Printf("Selar Webhook Received: Email=%s ProductID=%s ProductName=%s\n", 
		email, payload.ProductID, pName)

	// Accept "success" or if status is empty (some webhooks might omit it)
	if payload.Status != "" && payload.Status != "success" {
		return c.JSON(http.StatusOK, echo.Map{"message": "Ignored non-success status"})
	}

	var user User
	if err := a.DB.Where("email = ?", email).First(&user).Error; err != nil {
		fmt.Printf("User not found for email: %s\n", email)
		// Return 200 to stop retries
		return c.JSON(http.StatusOK, echo.Map{"message": "User not found, ignored"}) 
	}

	var profile Profile
	if err := a.DB.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
		fmt.Printf("Profile not found for user: %d\n", user.ID)
		return c.JSON(http.StatusOK, echo.Map{"message": "Profile not found, ignored"})
	}

	// Logic to determine action
	matched := false
	pID := payload.ProductID
	pName = strings.ToLower(pName) // normalize

	// Check 1: Hardcoded IDs or Env Vars
	if pID == "SELAR_SUB_ID" || pID == os.Getenv("SELAR_SUBSCRIPTION_ID") {
		// Pro Sub
		profile.IsSubscribed = true
		profile.SubscriptionTier = "Pro"
		profile.Credits += 700
		profile.CampaignCredits += 50
		expiry := time.Now().AddDate(0, 1, 0)
		profile.SubscriptionExpiresAt = &expiry
		matched = true
		fmt.Printf("Action: Pro Subscription (ID Match)\n")
		
		// Record Subscription
		sub := Subscription{
			UserID:             user.ID,
			Status:             "active",
			CurrentPeriodStart: time.Now(),
			CurrentPeriodEnd:   expiry,
			RecurringInterval:  "month",
		}
		a.DB.Create(&sub)

		// Record Invoice
		inv := Invoice{
			SubscriptionID: sub.ID,
			UserID:         user.ID,
			Amount:         20.00, // Example Amount
			Status:         "paid",
			PeriodStart:    time.Now(),
			PeriodEnd:      expiry,
		}
		a.DB.Create(&inv)
	} else if pID == "SELAR_STARTER_ID" || pID == os.Getenv("SELAR_STARTER_ID") {
		profile.Credits += 3000
		profile.CampaignCredits += 100
		matched = true
		fmt.Printf("Action: Starter Credits (ID Match)\n")
	} else if pID == "SELAR_BULK_ID" || pID == os.Getenv("SELAR_BULK_ID") {
		profile.Credits += 6000
		profile.CampaignCredits += 200
		matched = true
		fmt.Printf("Action: Bulk Credits (ID Match)\n")
	} else if pID == "SELAR_MEGA_TOPUP_ID" || pID == os.Getenv("SELAR_MEGA_TOPUP_ID") {
		profile.Credits += 30000
		profile.CampaignCredits += 1000
		matched = true
		fmt.Printf("Action: Mega Top-up (ID Match)\n")
	}

	// Check 2: Name Fuzzy Match (Fallback if no ID match)
	if !matched && pName != "" {
		if strings.Contains(pName, "starter top-up") || strings.Contains(pName, "starter pack") {
			profile.Credits += 3000
			profile.CampaignCredits += 100
			matched = true
			fmt.Printf("Action: Starter Credits (Name Match)\n")
		} else if strings.Contains(pName, "bulk top-up") || strings.Contains(pName, "bulk pack") {
			profile.Credits += 6000
			profile.CampaignCredits += 200
			matched = true
			fmt.Printf("Action: Bulk Credits (Name Match)\n")
		} else if strings.Contains(pName, "mega top-up") {
			profile.Credits += 30000
			profile.CampaignCredits += 1000
			matched = true
			fmt.Printf("Action: Mega Top-up (Name Match)\n")
		} else if strings.Contains(pName, "monthly recurring") || strings.Contains(pName, "pro access") {
			profile.IsSubscribed = true
			profile.SubscriptionTier = "Pro"
			profile.Credits += 700
			profile.CampaignCredits += 50
			expiry := time.Now().AddDate(0, 1, 0)
			profile.SubscriptionExpiresAt = &expiry
			matched = true
			fmt.Printf("Action: Pro Subscription (Name Match)\n")

			// Record Subscription
			sub := Subscription{
				UserID:             user.ID,
				Status:             "active",
				CurrentPeriodStart: time.Now(),
				CurrentPeriodEnd:   expiry,
				RecurringInterval:  "month",
			}
			a.DB.Create(&sub)

			// Record Invoice
			inv := Invoice{
				SubscriptionID: sub.ID,
				UserID:         user.ID,
				Amount:         20.00, // Example Amount
				Status:         "paid",
				PeriodStart:    time.Now(),
				PeriodEnd:      expiry,
			}
			a.DB.Create(&inv)
		}
	}

	if matched {
		if err := a.DB.Save(&profile).Error; err != nil {
			fmt.Printf("Failed to save profile: %v\n", err)
			return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Database error"})
		}
		return c.JSON(http.StatusOK, echo.Map{"status": "success", "message": "User credited"})
	}

	fmt.Printf("No matching product found for ID=%s Name=%s\n", pID, pName)
	return c.JSON(http.StatusOK, echo.Map{"status": "ignored", "reason": "unknown_product"})
}

// HandleGetImage proxies image requests to MinIO
func (a *App) HandleGetImage(c echo.Context) error {
	bucket := c.Param("bucket")
	filename := c.Param("filename")

	if bucket == "" || filename == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Missing bucket or filename"})
	}
    
    // Security check: ensure bucket is valid
    if bucket != "logos" && bucket != "products" {
         return c.JSON(http.StatusForbidden, echo.Map{"error": "Invalid bucket"})
    }

    realBucketName := a.MinioClient.BucketName
    
    // The URL param "bucket" corresponds to the folder (logos/products).
	// The URL param "filename" corresponds to the file (123.png).
	objectKey := fmt.Sprintf("%s/%s", bucket, filename)

	// Special case for root files in default bucket (logos)
	// Files uploaded via /upload or Profile update are at root with prefixes "upload-" or "logo-"
	if bucket == "logos" && (strings.HasPrefix(filename, "upload-") || strings.HasPrefix(filename, "logo-")) {
		objectKey = filename
	}

	stream, contentType, err := a.MinioClient.GetFileStream(realBucketName, objectKey)
	if err != nil {
		fmt.Printf("Failed to get image: %v\n", err)
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Image not found"})
	}
	defer stream.Close()

	return c.Stream(http.StatusOK, contentType, stream)
}

func (a *App) AdminGetUser(c echo.Context) error {
	// SECURITY: Same secret key as credit endpoint
	adminKey := c.QueryParam("key")
	expectedKey := os.Getenv("ADMIN_SECRET_KEY")
	if expectedKey == "" {
		expectedKey = "your_super_secret_password"
	}

	if adminKey != expectedKey {
		return c.String(http.StatusUnauthorized, "Unauthorized")
	}

	email := c.QueryParam("email")
	if email == "" {
		return c.String(http.StatusBadRequest, "Missing email")
	}

	var user User
	if err := a.DB.Where("email = ?", email).Preload("Profile").First(&user).Error; err != nil {
		return c.String(http.StatusNotFound, "User not found")
	}

	// Return a summary of the user's status
	summary := map[string]interface{}{
		"email":                 user.Email,
		"user_id":               user.ID,
		"subscription_tier":     user.Profile.SubscriptionTier,
		"is_subscribed":         user.Profile.IsSubscribed,
		"credits":               user.Profile.Credits,
		"campaign_credits":      user.Profile.CampaignCredits,
		"subscription_expires":  user.Profile.SubscriptionExpiresAt,
		"brand_name":            user.Profile.BrandName,
	}

	return c.JSON(http.StatusOK, summary)
}

func (a *App) AdminCreditUser(c echo.Context) error {
	// SECURITY: Add a simple secret key so only you can use this
	// In production, use os.Getenv("ADMIN_SECRET_KEY")
	adminKey := c.QueryParam("key")
	expectedKey := os.Getenv("ADMIN_SECRET_KEY")
	if expectedKey == "" {
		expectedKey = "your_super_secret_password" // Fallback default
	}

	if adminKey != expectedKey {
		return c.String(http.StatusUnauthorized, "Unauthorized")
	}

	email := c.QueryParam("email")
	action := c.QueryParam("action") // "sub", "starter", "bulk"

	if email == "" || action == "" {
		return c.String(http.StatusBadRequest, "Missing email or action")
	}

	var user User
	if err := a.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.String(http.StatusNotFound, "User not found")
	}

	var profile Profile
	if err := a.DB.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Profile not found")
	}

	switch action {
	case "sub":
		profile.IsSubscribed = true
		profile.SubscriptionTier = "Pro"
		profile.Credits += 700
		profile.CampaignCredits += 50
		expiry := time.Now().AddDate(0, 1, 0)
		profile.SubscriptionExpiresAt = &expiry
		
		// Record Subscription
		sub := Subscription{
			UserID:             user.ID,
			Status:             "active",
			CurrentPeriodStart: time.Now(),
			CurrentPeriodEnd:   expiry,
			RecurringInterval:  "month",
		}
		a.DB.Create(&sub)
		
		// Record Invoice (Admin Grant)
		inv := Invoice{
			SubscriptionID: sub.ID,
			UserID:         user.ID,
			Amount:         0.00,
			Status:         "paid",
			PeriodStart:    time.Now(),
			PeriodEnd:      expiry,
		}
		a.DB.Create(&inv)
	case "starter":
		profile.Credits += 3000
		profile.CampaignCredits += 100
	case "bulk":
		profile.Credits += 6000
		profile.CampaignCredits += 200
	case "mega_topup":
		profile.Credits += 30000
		profile.CampaignCredits += 1000
	case "undo_sub":
		profile.IsSubscribed = false
		profile.SubscriptionTier = "Free"
		profile.Credits -= 700
		profile.CampaignCredits -= 50
	case "undo_starter":
		profile.Credits -= 3000
		profile.CampaignCredits -= 100
	case "undo_bulk":
		profile.Credits -= 6000
		profile.CampaignCredits -= 200
	case "undo_mega_topup":
		profile.Credits -= 30000
		profile.CampaignCredits -= 1000
	default:
		return c.String(http.StatusBadRequest, "Invalid action. Use 'sub', 'starter', 'bulk', 'mega_topup' (or undo_ variants)")
	}

	if err := a.DB.Save(&profile).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Failed to update profile")
	}

	return c.String(http.StatusOK, fmt.Sprintf("User %s updated successfully with action: %s", email, action))
}

func (a *App) AdminListUsers(c echo.Context) error {
	// SECURITY
	adminKey := c.QueryParam("key")
	expectedKey := os.Getenv("ADMIN_SECRET_KEY")
	if expectedKey == "" {
		expectedKey = "your_super_secret_password"
	}

	if adminKey != expectedKey {
		return c.String(http.StatusUnauthorized, "Unauthorized")
	}

	var users []User
	if err := a.DB.Preload("Profile").Find(&users).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Failed to fetch users")
	}

	// Simple HTML Table construction
	html := `
	<!DOCTYPE html>
	<html>
	<head>
		<title>Updateer AI - Admin User List</title>
		<style>
			body { font-family: system-ui, sans-serif; background: #f8fafc; padding: 2rem; }
			h1 { color: #0f172a; }
			.table-container { background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); overflow: hidden; margin-bottom: 2rem; }
			table { width: 100%; border-collapse: collapse; text-align: left; }
			th { background: #1e293b; color: white; padding: 12px; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; }
			td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 0.95rem; }
			tr:last-child td { border-bottom: none; }
			tr:hover { background: #f1f5f9; }
			.badge { display: inline-block; padding: 4px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
			.badge-Free { background: #e2e8f0; color: #475569; }
			.badge-Pro { background: #dbeafe; color: #1e40af; }
			.badge-Agency { background: #fce7f3; color: #9d174d; }
			.sub-active { color: #16a34a; font-weight: bold; }
			.sub-inactive { color: #94a3b8; }
			.section-title { margin-top: 2rem; margin-bottom: 1rem; font-size: 1.25rem; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
		</style>
	</head>
	<body>
		<h1>Admin User Dashboard</h1>
	`

	// Group users by Tier
	grouped := make(map[string][]User)
	grouped["Agency"] = []User{}
	grouped["Pro"] = []User{}
	grouped["Free"] = []User{}

	for _, u := range users {
		tier := u.Profile.SubscriptionTier
		if tier == "" { tier = "Free" }
		
		if _, exists := grouped[tier]; exists {
			grouped[tier] = append(grouped[tier], u)
		} else {
			// Handle unknown tiers by putting them in Free or creating new
			grouped["Free"] = append(grouped["Free"], u)
		}
	}

	// Helper to render table
	renderTable := func(title string, userList []User) {
		html += fmt.Sprintf(`<div class="section-title">%s (%d)</div>`, title, len(userList))
		html += `<div class="table-container"><table>
			<thead>
				<tr>
					<th>ID</th>
					<th>Email</th>
					<th>Brand Name</th>
					<th>Credits</th>
					<th>Campaign Credits</th>
					<th>Sub Status</th>
					<th>Expiry</th>
				</tr>
			</thead>
			<tbody>`
		
		for _, u := range userList {
			subStatus := `<span class="sub-inactive">Inactive</span>`
			if u.Profile.IsSubscribed {
				subStatus = `<span class="sub-active">Active</span>`
			}
			
			expiry := "-"
			if u.Profile.SubscriptionExpiresAt != nil {
				expiry = u.Profile.SubscriptionExpiresAt.Format("2006-01-02")
			}

			html += fmt.Sprintf(`<tr>
				<td>%d</td>
				<td>%s</td>
				<td>%s</td>
				<td>%d</td>
				<td>%d</td>
				<td>%s</td>
				<td>%s</td>
			</tr>`, u.ID, u.Email, u.Profile.BrandName, u.Profile.Credits, u.Profile.CampaignCredits, subStatus, expiry)
		}
		html += `</tbody></table></div>`
	}

	// Render in specific order
	renderTable("Agency Plan (Mega Sub)", grouped["Agency"])
	renderTable("Pro Plan (Sub)", grouped["Pro"])
	renderTable("Free Plan", grouped["Free"])

	html += `</body></html>`

	return c.HTML(http.StatusOK, html)
}

func orDefault(s, def string) string {
	if s == "" {
		return def
	}
	return s
}

func (a *App) GetContacts(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var contacts []Contact
	if err := a.DB.Where("user_id = ?", userID).Find(&contacts).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to fetch contacts"})
	}
	return c.JSON(http.StatusOK, contacts)
}

func (a *App) AddContact(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var input Contact
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}
	input.UserID = userID
	input.CreatedAt = time.Now()

	if err := a.DB.Create(&input).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to create contact"})
	}
	return c.JSON(http.StatusOK, input)
}

func (a *App) UpdateContact(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id := c.Param("id")

	var contact Contact
	if err := a.DB.Where("id = ? AND user_id = ?", id, userID).First(&contact).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Contact not found"})
	}

	var input struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Tag   string `json:"tag"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}

	updates := map[string]interface{}{}
	// Allow clearing the name
	updates["name"] = input.Name
	
	if input.Email != "" {
		updates["email"] = input.Email
	}
	// Tag can be empty, but usually we just update it. 
	// If we want to allow clearing the tag, we should handle that.
	// For now, let's assume we update whatever is sent.
	updates["tag"] = input.Tag

	if err := a.DB.Model(&contact).Updates(updates).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to update contact"})
	}

	// Refetch to get updated fields
	a.DB.First(&contact, contact.ID)

	return c.JSON(http.StatusOK, contact)
}

func (a *App) ImportContacts(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var inputs []Contact
	if err := c.Bind(&inputs); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}

	for i := range inputs {
		inputs[i].UserID = userID
		inputs[i].CreatedAt = time.Now()
	}

	if len(inputs) > 0 {
		if err := a.DB.Create(&inputs).Error; err != nil {
			return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to import contacts"})
		}
	}
	return c.JSON(http.StatusOK, inputs)
}

func (a *App) DeleteContact(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id := c.Param("id")
	if err := a.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&Contact{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to delete contact"})
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "Contact deleted"})
}

func (a *App) GetDesigns(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var designs []SavedDesign
	// Optimize: Don't fetch the heavy HTML content for the list view
	if err := a.DB.Select("id, user_id, name, created_at").Where("user_id = ?", userID).Find(&designs).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to fetch designs"})
	}
	return c.JSON(http.StatusOK, designs)
}

func (a *App) GetDesign(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id := c.Param("id")
	var design SavedDesign
	if err := a.DB.Where("id = ? AND user_id = ?", id, userID).First(&design).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Design not found"})
	}
	return c.JSON(http.StatusOK, design)
}

func (a *App) SaveDesign(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var input SavedDesign
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}
	input.UserID = userID
	input.CreatedAt = time.Now()

	if err := a.DB.Create(&input).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to save design"})
	}
	return c.JSON(http.StatusOK, input)
}

func (a *App) DeleteDesign(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id := c.Param("id")
	if err := a.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&SavedDesign{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to delete design"})
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "Design deleted"})
}

func (a *App) AdminResetPassword(c echo.Context) error {
	// SECURITY: Same secret key as credit endpoint
	adminKey := c.QueryParam("key")
	expectedKey := os.Getenv("ADMIN_SECRET_KEY")
	if expectedKey == "" {
		expectedKey = "your_super_secret_password"
	}

	if adminKey != expectedKey {
		return c.String(http.StatusUnauthorized, "Unauthorized")
	}

	email := c.QueryParam("email")
	newPassword := c.QueryParam("password")

	if email == "" || newPassword == "" {
		return c.String(http.StatusBadRequest, "Missing email or password")
	}

	// Find the user first
	var user User
	if err := a.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.String(http.StatusNotFound, "User not found")
	}

	// Hash the new password
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to hash password")
	}

	// Update the user's password
	if err := a.DB.Model(&user).Update("password_hash", string(hash)).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Failed to update password")
	}

	return c.String(http.StatusOK, fmt.Sprintf("Password successfully updated for user %s", email))
}

func (a *App) InitResendWebhook(c echo.Context) error {
	// 1. Get API Key
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "RESEND_API_KEY not set"})
	}

	// 2. Get Public URL from request
	var input struct {
		HostUrl string `json:"host_url"` // e.g. "https://myapp.com"
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}

	if input.HostUrl == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "host_url is required"})
	}

	// Ensure no trailing slash
	input.HostUrl = strings.TrimSuffix(input.HostUrl, "/")
	webhookEndpoint := input.HostUrl + "/api/v1/webhooks/resend"

	client := resend.NewClient(apiKey)

	// 3. Create Webhook
	// We subscribe to all relevant events for analytics
	params := &resend.CreateWebhookRequest{
		Endpoint: webhookEndpoint,
		Events: []string{
			"email.sent",
			"email.delivered",
			"email.opened",
			"email.clicked",
			"email.bounced",
			"email.complained",
		},
	}

	webhook, err := client.Webhooks.Create(params)
	if err != nil {
		fmt.Printf("Failed to create webhook: %v\n", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to create webhook: " + err.Error()})
	}

	return c.JSON(http.StatusOK, echo.Map{
		"message": "Webhook created successfully",
		"id":      webhook.Id,
		"endpoint": webhookEndpoint,
		"events":   params.Events,
	})
}

func (a *App) UploadFile(c echo.Context) error {
	// Source
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "No file uploaded"})
	}
	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to open file"})
	}
	defer src.Close()

	// Destination
	userID := c.Get("user_id").(uint)
	ext := ".png" // default
	if strings.HasSuffix(strings.ToLower(file.Filename), ".jpg") || strings.HasSuffix(strings.ToLower(file.Filename), ".jpeg") {
		ext = ".jpg"
	} else if strings.HasSuffix(strings.ToLower(file.Filename), ".gif") {
		ext = ".gif"
	} else if strings.HasSuffix(strings.ToLower(file.Filename), ".svg") {
		ext = ".svg"
	} else if strings.HasSuffix(strings.ToLower(file.Filename), ".webp") {
		ext = ".webp"
	}

	filename := fmt.Sprintf("upload-%d-%d%s", userID, time.Now().UnixNano(), ext)

	// Use initialized MinIO client
	if a.MinioClient == nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Storage service unavailable"})
	}

	url, err := a.MinioClient.UploadFileStream(filename, src, file.Size, file.Header.Get("Content-Type"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Upload failed: " + err.Error()})
	}

	// Default to "logos" bucket as that's where UploadFileStream puts it (via default MinioClient)
	// And HandleGetImage handles "logos" bucket with "upload-" prefix at root.
	proxyURL := a.constructPublicURL(c, url, "logos")

	return c.JSON(http.StatusOK, echo.Map{
		"url": proxyURL,
	})
}

// --- Domain Management Handlers ---

func (a *App) ListDomains(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var domains []UserDomain
	if err := a.DB.Where("user_id = ?", userID).Find(&domains).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to fetch domains"})
	}

	// Sync unverified domains with Resend
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey != "" {
		client := resend.NewClient(apiKey)
		for i, d := range domains {
			if d.Status != "verified" && d.ResendID != "" {
				rDomain, err := client.Domains.Get(d.ResendID)
				if err == nil && (rDomain.Status != d.Status || true) { // Always update to get latest DNS record statuses
					// Serialize new DNS records
					dnsBytes, _ := json.Marshal(rDomain.Records)
					
					// Update local struct
					domains[i].Status = rDomain.Status
					domains[i].Region = rDomain.Region
					domains[i].DNSRecords = string(dnsBytes)
					
					// Update DB
					a.DB.Model(&UserDomain{}).Where("id = ?", d.ID).Updates(map[string]interface{}{
						"status":      rDomain.Status,
						"region":      rDomain.Region,
						"dns_records": string(dnsBytes),
					})
				}
			}
		}
	}

	return c.JSON(http.StatusOK, domains)
}

func (a *App) RegisterDomain(c echo.Context) error {
	userID := c.Get("user_id").(uint)

	// Fetch user profile to check subscription tier
	var profile Profile
	if err := a.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to fetch user profile"})
	}
	
	// Determine domain limit based on subscription
	limit := 1 // Free trial users now get 1 domain
	if profile.IsSubscribed {
		if profile.SubscriptionTier == "Agency" {
			limit = 3 // Mega-sub
		} else {
			limit = 1 // Pro/Personal sub
		}
	}

	// Check if user already has reached their domain limit
	var count int64
	a.DB.Model(&UserDomain{}).Where("user_id = ?", userID).Count(&count)
	
	if count >= int64(limit) {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": fmt.Sprintf("Domain limit reached (%d). Upgrade your plan to add more.", limit)})
	}

	var input struct {
		DomainName string `json:"domain_name"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}
	
	fmt.Printf("Registering domain: %s for user %d\n", input.DomainName, userID)

	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "RESEND_API_KEY not configured"})
	}

	client := resend.NewClient(apiKey)

	params := &resend.CreateDomainRequest{
		Name:   input.DomainName,
		Region: "us-east-1",
	}

	resendDomain, err := client.Domains.Create(params)
	if err != nil {
		fmt.Printf("Resend Create Error: %v\n", err)
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Failed to register domain with Resend: " + err.Error()})
	}

	// Serialize DNS records
	dnsBytes, _ := json.Marshal(resendDomain.Records)

	domain := UserDomain{
		UserID:     userID,
		DomainName: resendDomain.Name,
		ResendID:   resendDomain.Id,
		Status:     resendDomain.Status,
		Region:     resendDomain.Region,
		DNSRecords: string(dnsBytes),
		CreatedAt:  time.Now(),
	}

	if err := a.DB.Create(&domain).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to save domain to database"})
	}

	return c.JSON(http.StatusOK, domain)
}

func (a *App) GetDomainStatus(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id := c.Param("id")

	var domain UserDomain
	if err := a.DB.Where("id = ? AND user_id = ?", id, userID).First(&domain).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Domain not found"})
	}

	if domain.ResendID == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Domain has no Resend ID"})
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	rDomain, err := client.Domains.Get(domain.ResendID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to fetch status from Resend"})
	}

	// Update DB if changed
	// Always update records to ensure individual DNS statuses (not_started -> verified) are captured
	dnsBytes, _ := json.Marshal(rDomain.Records)
	domain.Status = rDomain.Status
	domain.Region = rDomain.Region
	domain.DNSRecords = string(dnsBytes)

	a.DB.Model(&domain).Updates(map[string]interface{}{
		"status":      rDomain.Status,
		"region":      rDomain.Region,
		"dns_records": string(dnsBytes),
	})

	return c.JSON(http.StatusOK, domain)
}

func (a *App) VerifyDomain(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id := c.Param("id")

	var domain UserDomain
	if err := a.DB.Where("id = ? AND user_id = ?", id, userID).First(&domain).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Domain not found"})
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	// Trigger verification on Resend
	verified, err := client.Domains.Verify(domain.ResendID)
	if err != nil {
		fmt.Printf("Verification check failed: %v\n", err)
	} else {
		fmt.Printf("Verification check triggered successfully. Verified: %v\n", verified)
	}

	// Add delay to allow Resend to update internal state
	time.Sleep(1 * time.Second)

	// Fetch latest status
	updatedDomain, err := client.Domains.Get(domain.ResendID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to fetch domain status from Resend"})
	}
	fmt.Printf("Fetched latest status via Get endpoint. Status: %s\n", updatedDomain.Status)

	// Auto-Enable Analytics if Verified
	if strings.ToLower(updatedDomain.Status) == "verified" {
		params := &resend.UpdateDomainRequest{
			ClickTracking: true,
			OpenTracking:  true,
		}
		_, err := client.Domains.Update(domain.ResendID, params)
		if err != nil {
			fmt.Printf("Failed to auto-enable analytics: %v\n", err)
		} else {
			domain.HasTracking = true
			// Refetch domain to get updated DNS records (e.g. tracking CNAME)
			latestDomain, err := client.Domains.Get(domain.ResendID)
			if err == nil {
				updatedDomain = latestDomain
			}
		}
	}

	// Update local DB
	domain.Status = updatedDomain.Status
	domain.Region = updatedDomain.Region
	
	// Update DNS records
	dnsBytes, _ := json.Marshal(updatedDomain.Records)
	domain.DNSRecords = string(dnsBytes)

	if err := a.DB.Save(&domain).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to update domain status"})
	}

	return c.JSON(http.StatusOK, domain)
}

func (a *App) DeleteDomain(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	domainID := c.Param("id")

	var domain UserDomain
	if err := a.DB.Where("id = ? AND user_id = ?", domainID, userID).First(&domain).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Domain not found"})
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	// Delete from Resend
	_, err := client.Domains.Remove(domain.ResendID)
	if err != nil {
		fmt.Printf("Failed to delete from Resend (might already be gone): %v\n", err)
	}

	// Delete from DB
	if err := a.DB.Delete(&domain).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to delete domain"})
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "Domain deleted"})
}

func (a *App) SendEmail(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var input struct {
		Recipients  []string `json:"recipients"`
		From        string   `json:"from"` // e.g., "Me <hello@mybrand.com>"
		Subject     string   `json:"subject"`
		HTML        string   `json:"html"`
		LogoData    string   `json:"logoData"`
		ProductData string   `json:"productData"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}

	if len(input.Recipients) == 0 {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "No recipients provided"})
	}

	// Verify user has credits
	var user User
	if err := a.DB.Preload("Profile").First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "User not found"})
	}

	cost := len(input.Recipients)
	if user.Profile.Credits < cost {
		return c.JSON(http.StatusPaymentRequired, echo.Map{"error": fmt.Sprintf("Insufficient credits. Need %d, have %d", cost, user.Profile.Credits)})
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	// Prepare attachments
	// Use user's logo from profile.
	// We support Data URI (attached as CID) or regular URLs (replaced in HTML).
	
	// var attachments []*resend.Attachment // Attachments disabled for Batch API
	// hasAttachedLogo := false
	
	/*
	if user.Profile.LogoURL != "" {
		if strings.HasPrefix(user.Profile.LogoURL, "data:") {
			// ... logic for base64 ...
		} else {
			// ... logic for MinIO fetch ...
		}
	} else {
		// Logo is compulsory
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Brand logo is required in profile to send emails"})
	}
	*/
	
	if user.Profile.LogoURL == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Brand logo is required in profile to send emails"})
	}

	// Filter unsubscribed users
	var validRecipients []string
	for _, email := range input.Recipients {
		var count int64
		a.DB.Model(&UnsubscribedUser{}).Where("user_id = ? AND email = ?", userID, email).Count(&count)
		if count == 0 {
			validRecipients = append(validRecipients, email)
		}
	}

	if len(validRecipients) == 0 {
		return c.JSON(http.StatusOK, echo.Map{"message": "All recipients have unsubscribed", "data": []interface{}{}})
	}

	// Create batch requests
	batchEmails := make([]*resend.SendEmailRequest, len(validRecipients))
	
	// Dynamic Host Replacement for Localhost
	// If S3_ENDPOINT or MINIO_PUBLIC_HOST is set, we swap localhost references
	// so external email clients can actually load the images.
	
	s3Endpoint := os.Getenv("S3_ENDPOINT")
	s3UseSSL := os.Getenv("S3_USE_SSL") == "true"
	
	var publicHost string
	if s3Endpoint != "" {
		scheme := "http"
		if s3UseSSL {
			scheme = "https"
		}
		if !strings.HasPrefix(s3Endpoint, "http") {
			publicHost = fmt.Sprintf("%s://%s", scheme, s3Endpoint)
		} else {
			publicHost = s3Endpoint
		}
	} else {
		publicHost = os.Getenv("MINIO_PUBLIC_HOST")
	}

	// Clean the public host (remove trailing slash if present)
	if publicHost != "" {
		publicHost = strings.TrimRight(publicHost, "/")
		// Ensure it has protocol if missing (though usually env var has it, let's be safe)
		if !strings.HasPrefix(publicHost, "http") {
			publicHost = "https://" + publicHost
		}
	}

	// App URL for Unsubscribe Link
	// Priority: APP_URL > MINIO_PUBLIC_HOST > localhost
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		if publicHost != "" {
			appURL = publicHost // Reuse the detected public tunnel/domain
		} else {
			appURL = "http://localhost:8080"
		}
	}
	appURL = strings.TrimRight(appURL, "/")

	for i, email := range validRecipients {
		htmlContent := input.HTML

		// Safety: Replace backend localhost references with public APP_URL
		// This ensures product images uploaded/generated locally are accessible in emails
		if appURL != "" {
			htmlContent = strings.ReplaceAll(htmlContent, "http://localhost:8080", appURL)
		}

		// Fix: Swap internal MinIO references for public tunnel URL globally in HTML
		if publicHost != "" {
			htmlContent = strings.ReplaceAll(htmlContent, "http://localhost:9000", publicHost)
			htmlContent = strings.ReplaceAll(htmlContent, "localhost:9000", publicHost)
			htmlContent = strings.ReplaceAll(htmlContent, "http://pulse-minio-ent:9000", publicHost)
			htmlContent = strings.ReplaceAll(htmlContent, "pulse-minio-ent:9000", publicHost)
			htmlContent = strings.ReplaceAll(htmlContent, "http://minio:9000", publicHost)
			htmlContent = strings.ReplaceAll(htmlContent, "minio:9000", publicHost)
		}

		// Replace placeholders with the public URL directly
		if user.Profile.LogoURL != "" {
			// If the logo is a Data URI (Base64), it will be embedded directly in the HTML string.
			// Otherwise, we use the MinIO/Public URL directly.
			logoReference := user.Profile.LogoURL
			
			// Fix: Swap localhost/internal for public tunnel URL
			if publicHost != "" {
				// Replace "http://localhost:9000" or "localhost:9000"
				logoReference = strings.Replace(logoReference, "http://localhost:9000", publicHost, 1)
				logoReference = strings.Replace(logoReference, "localhost:9000", publicHost, 1)
				
				// Also replace internal docker service name references
				logoReference = strings.Replace(logoReference, "http://pulse-minio-ent:9000", publicHost, 1)
				logoReference = strings.Replace(logoReference, "pulse-minio-ent:9000", publicHost, 1)
			}

			// Handle standard placeholder replacements
			htmlContent = strings.ReplaceAll(htmlContent, "https://via.placeholder.com/150?text=LOGO", logoReference)
			
			// Safety check: ensure existing CID references in your template point to the URL instead
			htmlContent = strings.ReplaceAll(htmlContent, "cid:brand-logo", logoReference)
			htmlContent = strings.ReplaceAll(htmlContent, "cid:logo.png", logoReference)
			htmlContent = strings.ReplaceAll(htmlContent, "cid:logo", logoReference)
		} else {
			// Fallback (though compulsory above)
			htmlContent = strings.ReplaceAll(htmlContent, "https://via.placeholder.com/150?text=LOGO", user.Profile.LogoURL)
		}

		htmlContent = strings.ReplaceAll(htmlContent, "https://via.placeholder.com/400?text=Product+Image", "cid:product.png") // If we supported product images similarly

		// Append Unsubscribe Footer
		unsubToken := generateUnsubscribeToken(userID, email)
		unsubLink := fmt.Sprintf("%s/api/v1/unsubscribe?token=%s", appURL, unsubToken)
		
		// Add footer if not present (simple check)
		// We append a simple footer block
		footer := fmt.Sprintf(`
			<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #888;">
				<p>You received this email because you signed up for updates from %s.</p>
				<p><a href="%s" style="color: #888; text-decoration: underline;">Unsubscribe</a></p>
			</div>
		`, user.Profile.BrandName, unsubLink)

		// Insert before </body> if possible, else append
		if strings.Contains(htmlContent, "</body>") {
			htmlContent = strings.Replace(htmlContent, "</body>", footer+"</body>", 1)
		} else {
			htmlContent += footer
		}

		batchEmails[i] = &resend.SendEmailRequest{
			From:        input.From,
			To:          []string{email},
			Subject:     input.Subject,
			Html:        htmlContent,
			// Attachments: attachments, // Attachments removed to support Batch API
			ReplyTo:     input.From,
			Headers: map[string]string{
				"List-Unsubscribe": fmt.Sprintf("<%s>", unsubLink),
				"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
			},
		}
	}

	ctx := c.Request().Context()
	sent, err := client.Batch.SendWithContext(ctx, batchEmails)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to send emails: " + err.Error()})
	}

	// Capture sent emails for analytics
	// sent.Data order matches request order
	if len(sent.Data) == len(input.Recipients) {
		for i, resp := range sent.Data {
			sentEmail := SentEmail{
				ResendID:  resp.Id,
				UserID:    userID,
				Status:    "sent",
				Subject:   input.Subject,
				Recipient: input.Recipients[i],
				CreatedAt: time.Now(),
			}
			if err := a.DB.Create(&sentEmail).Error; err != nil {
				fmt.Printf("Failed to log sent email to %s: %v\n", input.Recipients[i], err)
			}
		}
	} else {
		// Fallback if lengths don't match (unlikely but safe)
		fmt.Println("Warning: Batch response count mismatch")
	}

	// Deduct credits
	user.Profile.Credits -= cost
	a.DB.Save(&user.Profile)

	return c.JSON(http.StatusOK, echo.Map{"message": fmt.Sprintf("Sent to %d recipients", cost), "data": sent.Data})
}

// Helper to generate unsubscribe token (simple base64 for now)
// In production, sign this with a secret key (HMAC) to prevent tampering
func generateUnsubscribeToken(userID uint, email string) string {
	data := fmt.Sprintf("%d:%s", userID, email)
	return base64.URLEncoding.EncodeToString([]byte(data))
}

func parseUnsubscribeToken(token string) (uint, string, error) {
	data, err := base64.URLEncoding.DecodeString(token)
	if err != nil {
		return 0, "", err
	}
	parts := strings.SplitN(string(data), ":", 2)
	if len(parts) != 2 {
		return 0, "", fmt.Errorf("invalid token format")
	}
	var userID uint
	fmt.Sscanf(parts[0], "%d", &userID)
	return userID, parts[1], nil
}

func (a *App) HandleUnsubscribe(c echo.Context) error {
	token := c.QueryParam("token")
	if token == "" {
		return c.String(http.StatusBadRequest, "Invalid request")
	}

	userID, email, err := parseUnsubscribeToken(token)
	if err != nil {
		return c.String(http.StatusBadRequest, "Invalid token")
	}

	// Record unsubscribe
	unsub := UnsubscribedUser{
		UserID: userID,
		Email:  email,
		CreatedAt: time.Now(),
	}
	// Use FirstOrCreate to avoid duplicates
	if err := a.DB.Where(UnsubscribedUser{UserID: userID, Email: email}).FirstOrCreate(&unsub).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Internal error")
	}

	// Find brand name for nicer message
	var profile Profile
	a.DB.Where("user_id = ?", userID).First(&profile)
	brandName := profile.BrandName
	if brandName == "" {
		brandName = "the sender"
	}

	html := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head><title>Unsubscribed</title></head>
		<body style="font-family: sans-serif; text-align: center; padding: 40px;">
			<h1>You have been unsubscribed</h1>
			<p>You will no longer receive emails from <strong>%s</strong>.</p>
			<p style="color: #666; font-size: 12px; margin-top: 20px;">%s</p>
		</body>
		</html>
	`, brandName, email)

	return c.HTML(http.StatusOK, html)
}

func (a *App) HandleUnsubscribeOneClick(c echo.Context) error {
	// RFC 8058 One-Click Unsubscribe (POST)
	// The token usually comes in the query params of the POST URL
	token := c.QueryParam("token")
	if token == "" {
		// Sometimes body? But usually headers define the URL with params
		return c.NoContent(http.StatusBadRequest)
	}

	userID, email, err := parseUnsubscribeToken(token)
	if err != nil {
		return c.NoContent(http.StatusBadRequest)
	}

	unsub := UnsubscribedUser{UserID: userID, Email: email, CreatedAt: time.Now()}
	a.DB.Where(UnsubscribedUser{UserID: userID, Email: email}).FirstOrCreate(&unsub)

	return c.NoContent(http.StatusOK)
}

func (a *App) HandleResendWebhook(c echo.Context) error {
	secret := os.Getenv("RESEND_WEBHOOK_SECRET")
	if secret == "" {
		// Log error internally but return 500
		fmt.Println("RESEND_WEBHOOK_SECRET is not set")
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Webhook secret not configured"})
	}

	// Read payload body
	payload, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Failed to read payload"})
	}

	// Verify Signature
	headers := c.Request().Header
	wh, err := svix.NewWebhook(secret)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to create webhook verifier"})
	}

	if err := wh.Verify(payload, headers); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid signature"})
	}

	// Parse JSON
	var event ResendWebhookPayload
	if err := json.Unmarshal(payload, &event); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid JSON"})
	}

	// Update DB
	if event.Data.EmailID != "" {
		var email SentEmail
		if err := a.DB.Where("resend_id = ?", event.Data.EmailID).First(&email).Error; err == nil {
			// Status priority logic to prevent overwriting higher states (e.g. clicked -> opened)
			priorities := map[string]int{
				"sent":            1,
				"email.sent":      1,
				"email.delivered": 2,
				"email.opened":    3,
				"email.clicked":   4,
			}

			currP := priorities[email.Status]
			newP := priorities[event.Type]

			// Always update if it's a bounce, complaint, or if new status is higher priority
			if event.Type == "email.bounced" || event.Type == "email.complained" || newP > currP {
				result := a.DB.Model(&email).Update("status", event.Type)
				if result.Error != nil {
					fmt.Printf("Failed to update email status for %s: %v\n", event.Data.EmailID, result.Error)
				} else {
					fmt.Printf("Updated email %s status to %s\n", event.Data.EmailID, event.Type)
				}
			} else {
				fmt.Printf("Skipped update for %s: %s (current) >= %s (new)\n", event.Data.EmailID, email.Status, event.Type)
			}
		}
	}

	return c.NoContent(http.StatusOK)
}

func (a *App) GetAnalyticsSummary(c echo.Context) error {
	userID := c.Get("user_id").(uint)

	var totalSent, delivered, opened, clicked, bounced, complained int64

	// Count metrics (User Isolated)
	// Sent = All records
	// Delivered = status IN (delivered, opened, clicked)
	// Opened = status IN (opened, clicked)
	// Clicked = status IN (clicked)
	// Bounced = status IN (bounced)
	// Complained = status IN (complained)
	
	tx := a.DB.Model(&SentEmail{}).Where("user_id = ?", userID)

	tx.Count(&totalSent)
	tx.Where("status IN ?", []string{"email.delivered", "email.opened", "email.clicked"}).Count(&delivered)
	tx.Where("status IN ?", []string{"email.opened", "email.clicked"}).Count(&opened)
	tx.Where("status IN ?", []string{"email.clicked"}).Count(&clicked)
	tx.Where("status = ?", "email.bounced").Count(&bounced)
	tx.Where("status = ?", "email.complained").Count(&complained)

	// Ensure counts are logical (e.g., opens cannot be greater than delivered)
	if opened > delivered { delivered = opened }
	if clicked > opened { opened = clicked }
	if clicked > delivered { delivered = clicked }

	summary := []map[string]interface{}{
		{"name": "Total Sent", "value": totalSent, "color": "#64748b"},
		{"name": "Delivered", "value": delivered, "color": "#22c55e"},
		{"name": "Unique Opens", "value": opened, "color": "#8b5cf6"},
		{"name": "Total Clicks", "value": clicked, "color": "#3b82f6"},
		{"name": "Bounces", "value": bounced, "color": "#f59e0b"},
		{"name": "Complaints", "value": complained, "color": "#ef4444"},
	}

	return c.JSON(http.StatusOK, summary)
}

func (a *App) GetAnalyticsPerformance(c echo.Context) error {
	userID := c.Get("user_id").(uint)

	// We want to return data for the last 7 days
	// Output format: [{ date: "Mon", opens: 10, clicks: 5 }, ...]
	
	type DailyStat struct {
		DateStr string
		Opens   int
		Clicks  int
	}

	// Initialize map for last 7 days
	statsMap := make(map[string]*DailyStat)
	var orderedDates []string
	
	now := time.Now()
	for i := 6; i >= 0; i-- {
		d := now.AddDate(0, 0, -i)
		dateKey := d.Format("2006-01-02") // DB grouping key
		displayDate := d.Format("Mon")    // Frontend display key (e.g., "Mon")
		
		statsMap[dateKey] = &DailyStat{DateStr: displayDate, Opens: 0, Clicks: 0}
		orderedDates = append(orderedDates, dateKey)
	}

	// Fetch Opens (grouped by day)
	// In Postgres: to_char(created_at, 'YYYY-MM-DD')
	rows, err := a.DB.Model(&SentEmail{}).
		Select("to_char(created_at, 'YYYY-MM-DD') as date, count(*) as count").
		Where("user_id = ? AND status IN ('email.opened', 'email.clicked')", userID).
		Where("created_at > ?", now.AddDate(0, 0, -7)).
		Group("to_char(created_at, 'YYYY-MM-DD')").
		Rows()
	
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var date string
			var count int
			rows.Scan(&date, &count)
			if val, ok := statsMap[date]; ok {
				val.Opens = count
			}
		}
	}

	// Fetch Clicks (grouped by day)
	rowsClicks, err := a.DB.Model(&SentEmail{}).
		Select("to_char(created_at, 'YYYY-MM-DD') as date, count(*) as count").
		Where("user_id = ? AND status = 'email.clicked'", userID).
		Where("created_at > ?", now.AddDate(0, 0, -7)).
		Group("to_char(created_at, 'YYYY-MM-DD')").
		Rows()

	if err == nil {
		defer rowsClicks.Close()
		for rowsClicks.Next() {
			var date string
			var count int
			rowsClicks.Scan(&date, &count)
			if val, ok := statsMap[date]; ok {
				val.Clicks = count
			}
		}
	}

	// Construct final array
	var result []map[string]interface{}
	for _, dateKey := range orderedDates {
		s := statsMap[dateKey]
		result = append(result, map[string]interface{}{
			"date": s.DateStr,
			"opens": s.Opens,
			"clicks": s.Clicks,
		})
	}

	return c.JSON(http.StatusOK, result)
}
