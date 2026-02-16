package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"backend/storage"

	"cloud.google.com/go/vertexai/genai"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/resend/resend-go/v3"
	svix "github.com/svix/svix-webhooks/go"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type User struct {
	ID           uint   `gorm:"primaryKey"`
	Email        string `gorm:"uniqueIndex"`
	PasswordHash string
	Profile      Profile
	Domains      []UserDomain
	CreatedAt    time.Time
}

type Profile struct {
	ID                    uint       `gorm:"primaryKey"`
	UserID                uint       `gorm:"uniqueIndex"`
	BrandName             string     `json:"brandName"`
	BrandDescription      string     `json:"brandDescription"`
	LogoURL               string     `json:"logoUrl"`
	FacebookURL           string     `json:"facebookUrl"`
	TwitterURL            string     `json:"twitterUrl"`
	LinkedinURL           string     `json:"linkedinUrl"`
	PrivacyPolicyURL      string     `json:"privacyPolicyUrl"`
	Credits               int        `json:"credits"`
	CampaignCredits       int        `json:"campaignCredits"`
	SubscriptionTier      string     `json:"subscriptionTier"`
	IsSubscribed          bool       `json:"isSubscribed"`
	SubscriptionExpiresAt *time.Time `json:"subscriptionExpiresAt"`
}

type UserDomain struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"index" json:"-"`
	DomainName  string    `json:"domainName"`
	ResendID    string    `json:"resendDomainId"`
	Status      string    `json:"status"`
	Region      string    `json:"region"`
	DNSRecords  string    `gorm:"type:text" json:"dnsRecords"`
	HasTracking bool      `json:"hasTracking"`
	CreatedAt   time.Time `json:"createdAt"`
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
	Status    string    `json:"status"`
	Subject   string    `json:"subject"`
	Recipient string    `json:"recipient"`
	CreatedAt time.Time `json:"created_at"`
}

type UnsubscribedUser struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"-"`
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
	DB          *gorm.DB
	MinioClient *storage.MinioClient
}

type Subscription struct {
	ID                 uint `gorm:"primaryKey"`
	UserID             uint `gorm:"index"`
	Status             string
	CurrentPeriodStart time.Time
	CurrentPeriodEnd   time.Time
	RecurringInterval  string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type Invoice struct {
	ID             uint `gorm:"primaryKey"`
	SubscriptionID uint `gorm:"index"`
	UserID         uint `gorm:"index"`
	Amount         float64
	Status         string
	PeriodStart    time.Time
	PeriodEnd      time.Time
	CreatedAt      time.Time
}

type jwtCustomClaims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

func main() {
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

	// Migration: Fix Logo URLs to use 'browser' bucket
	// This replaces /logos/ with /browser/logos/ in existing URLs
	// to match the working file path structure in MinIO
	db.Exec("UPDATE profiles SET logo_url = REPLACE(logo_url, '/logos/', '/browser/logos/') WHERE logo_url LIKE '%/logos/%' AND logo_url NOT LIKE '%/browser/%'")

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.BodyLimit("5M"))
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

	api.POST("/upload", app.RequireAuth(app.UploadFile))

	api.GET("/images/:bucket/:filename", app.HandleGetImage)

	api.GET("/domains", app.RequireAuth(app.ListDomains))
	api.POST("/domains", app.RequireAuth(app.RegisterDomain))
	api.GET("/domains/:id", app.RequireAuth(app.GetDomainStatus))
	api.POST("/domains/:id/verify", app.RequireAuth(app.VerifyDomain))
	api.DELETE("/domains/:id", app.RequireAuth(app.DeleteDomain))

	api.POST("/send", app.RequireAuth(app.SendEmail))

	api.GET("/unsubscribe", app.HandleUnsubscribe)
	api.POST("/unsubscribe", app.HandleUnsubscribeOneClick)

	api.POST("/webhooks/resend", app.HandleResendWebhook)

	api.GET("/analytics/summary", app.RequireAuth(app.GetAnalyticsSummary))
	api.GET("/analytics/performance", app.RequireAuth(app.GetAnalyticsPerformance))

	api.GET("/admin/credit", app.AdminCreditUser)
	api.GET("/admin/users", app.AdminListUsers)
	api.GET("/admin/user", app.AdminGetUser)
	api.GET("/admin/reset-password", app.AdminResetPassword)
	api.POST("/admin/webhook/init", app.InitResendWebhook)
	api.POST("/admin/api-keys", app.CreateResendApiKey)

	go func() {
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
		IdleTimeout:  120 * time.Second,
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
	user.Profile = Profile{
		Credits:          20,
		CampaignCredits:  5,
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

	if input.LogoURL != "" && strings.HasPrefix(input.LogoURL, "data:") {
		parts := strings.Split(input.LogoURL, ",")
		if len(parts) == 2 {
			meta := parts[0]
			data := parts[1]
			ext := ".png"
			if strings.Contains(meta, "image/jpeg") {
				ext = ".jpg"
			} else if strings.Contains(meta, "image/gif") {
				ext = ".gif"
			} else if strings.Contains(meta, "image/svg+xml") {
				ext = ".svg"
			}

			decoded, err := base64.StdEncoding.DecodeString(data)
			if err == nil {
				if a.MinioClient != nil {
					filename := fmt.Sprintf("logo-%d-%d%s", userID, time.Now().Unix(), ext)
					contentType := strings.TrimSuffix(strings.TrimPrefix(meta, "data:"), ";base64")

					url, err := a.MinioClient.UploadFile(filename, decoded, contentType)
					if err == nil {
						input.LogoURL = url
					}
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

		var user User
		if err := a.DB.Preload("Profile").First(&user, claims.UserID).Error; err == nil {
			profile := user.Profile
			if profile.IsSubscribed && profile.SubscriptionExpiresAt != nil && time.Now().After(*profile.SubscriptionExpiresAt) {
				profile.IsSubscribed = false
				profile.SubscriptionTier = "Free"
				a.DB.Save(&profile)
			}
			isSubscribed := profile.IsSubscribed
			var totalSent int64
			a.DB.Model(&SentEmail{}).Where("user_id = ?", claims.UserID).Count(&totalSent)
			hasTopUp := profile.Credits > 20 || profile.CampaignCredits > 5
			trialExhausted := profile.Credits <= 0 || totalSent >= 20
			inFreeTrial := !hasTopUp && !trialExhausted

			if !isSubscribed && !inFreeTrial {
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

	cleanFilename := strings.TrimPrefix(filename, bucket+"/")
	// URL encode the filename part to handle spaces and special chars
	parts := strings.Split(cleanFilename, "/")
	for i, p := range parts {
		parts[i] = url.PathEscape(p)
	}
	encodedFilename := strings.Join(parts, "/")

	if s3Endpoint != "" {
		scheme := "http"
		if s3UseSSL {
			scheme = "https"
		}
		if !strings.HasPrefix(s3Endpoint, "http") {
			s3Endpoint = fmt.Sprintf("%s://%s", scheme, s3Endpoint)
		}
		s3Endpoint = strings.TrimRight(s3Endpoint, "/")
		return fmt.Sprintf("%s/%s/%s", s3Endpoint, bucket, encodedFilename)
	}

	scheme := "https"
	if c.Request().TLS == nil && c.Request().Header.Get("X-Forwarded-Proto") == "http" {
		scheme = "http"
	}
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = fmt.Sprintf("%s://%s", scheme, c.Request().Host)
	}
	appURL = strings.TrimSuffix(appURL, "/")
	return fmt.Sprintf("%s/api/v1/images/%s/%s", appURL, bucket, encodedFilename)
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
		ProductImages    []ProductImage `json:"productImages"`
	}

	if err := c.Bind(&config); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}

	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	location := os.Getenv("GOOGLE_CLOUD_LOCATION")
	if projectID == "" || location == "" {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Vertex AI configuration (GOOGLE_CLOUD_PROJECT/LOCATION) not set"})
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, projectID, location)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to create Vertex AI client: " + err.Error()})
	}
	defer client.Close()

	// Prepare conditional sections
	var socialLinks []string
	if config.FacebookURL != "" {
		socialLinks = append(socialLinks, fmt.Sprintf("<a href=\"%s\">Facebook</a>", config.FacebookURL))
	}
	if config.TwitterURL != "" {
		socialLinks = append(socialLinks, fmt.Sprintf("<a href=\"%s\">Twitter</a>", config.TwitterURL))
	}
	if config.LinkedinURL != "" {
		socialLinks = append(socialLinks, fmt.Sprintf("<a href=\"%s\">LinkedIn</a>", config.LinkedinURL))
	}
	socialsInstruction := ""
	if len(socialLinks) > 0 {
		socialsHTML := strings.Join(socialLinks, " | ")
		socialsInstruction = fmt.Sprintf("For the social links section, you MUST insert EXACTLY this HTML snippet at the bottom of the email (do not modify it): <p>%s</p>", socialsHTML)
	}

	ctaInstruction := "Do NOT generate a Call-To-Action (CTA) button."
	if config.CTALabel != "" && config.CTAUrl != "" {
		ctaInstruction = fmt.Sprintf("Include a CTA button labeled '%s' linking to '%s'", config.CTALabel, config.CTAUrl)
	}

	productImagesInstruction := ""
	if len(config.ProductImages) > 0 {
		var imgTags []string
		for _, img := range config.ProductImages {
			// Ensure URL is absolute/publicly accessible
			// Ideally, GenerateEmail receives full URLs.
			// If not, we rely on what frontend sends.
			// Assuming frontend sends the URL from /api/v1/upload response.
			imgTags = append(imgTags, fmt.Sprintf(`<div style="margin: 20px 0;"><img src="%s" alt="%s" style="max-width: 100%%; height: auto; border-radius: 8px;"><p style="text-align: center; color: #666; font-size: 14px;">%s</p></div>`, img.URL, img.Name, img.Name))
		}
		productImagesInstruction = "Include these product images in the body where appropriate:\n" + strings.Join(imgTags, "\n")
	}

	// Sanitize Logo URL for the prompt (replace spaces with %20)
	// This ensures the AI receives a valid URL even if the DB has spaces
	safeLogoURL := strings.ReplaceAll(config.LogoURL, " ", "%20")

	prompt := fmt.Sprintf(`Generate an HTML email.
Type: %s
Brand: %s
Goal: %s
Audience: %s
Voice: %s
Must Haves: %s
Style: %s
Context: %s

STRICT GENERATION RULES:
1. BRAND CONTEXT (CRITICAL): You MUST incorporate the Brand Context into the email copy. Use the brand's voice and tone throughout. Do not sound generic.
2. IMAGES: You must use the Brand Logo (%s) at the top. Do NOT use any other images, banners, or color blocks.
3. PRODUCT IMAGES: %s
4. CTA: %s
5. SOCIALS: %s
6. FOOTER: Do NOT include privacy policy or unsubscribe links.
7. CONTENT: Strictly use the provided campaign Type and Context. Do not hallucinate offers or details not present in the input.
8. TONE: The email MUST sound authentic, conversational, and human. Avoid robotic phrases, marketing jargon, and overly formal language. Write as if a real person is emailing a friend or colleague.

Return ONLY JSON with the following structure:
{
  "html": "The full HTML email code",
  "reactCode": "A React component version of the email (using Tailwind CSS classes)",
  "metadata": {
    "subjectLine": "The email subject",
    "category": "One of: Newsletter, Welcome, Promo, Transactional",
    "estimatedReadTime": 2
  }
}`,
		config.Type, config.BrandName, config.PrimaryGoal, config.AudienceProfile,
		config.BrandVoice, config.MustHaves, config.DesignStyle, config.Context,
		safeLogoURL,
		productImagesInstruction,
		ctaInstruction,
		socialsInstruction)

	model := client.GenerativeModel("gemini-2.5-flash") // Update to stable model if needed, keeping existing if it works
	model.ResponseMIMEType = "application/json"

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		fmt.Printf("AI Error: %v\n", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "AI Generation failed: " + err.Error()})
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Empty response from AI"})
	}

	var result struct {
		HTML      string `json:"html"`
		ReactCode string `json:"reactCode"`
		Metadata  struct {
			SubjectLine       string `json:"subjectLine"`
			Category          string `json:"category"`
			EstimatedReadTime int    `json:"estimatedReadTime"`
		} `json:"metadata"`
	}

	text, ok := resp.Candidates[0].Content.Parts[0].(genai.Text)
	if !ok {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Invalid response format"})
	}

	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to parse AI response"})
	}

	return c.JSON(http.StatusOK, result)
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
	var contact Contact
	if err := c.Bind(&contact); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}
	contact.UserID = userID
	contact.CreatedAt = time.Now()

	if err := a.DB.Create(&contact).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to create contact"})
	}
	return c.JSON(http.StatusOK, contact)
}

func (a *App) UpdateContact(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id := c.Param("id")
	var contact Contact
	if err := a.DB.Where("id = ? AND user_id = ?", id, userID).First(&contact).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Contact not found"})
	}
	if err := c.Bind(&contact); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}
	a.DB.Save(&contact)
	return c.JSON(http.StatusOK, contact)
}

func (a *App) ImportContacts(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var contacts []Contact
	if err := c.Bind(&contacts); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}
	for i := range contacts {
		contacts[i].UserID = userID
		contacts[i].CreatedAt = time.Now()
	}
	if len(contacts) > 0 {
		if err := a.DB.Create(&contacts).Error; err != nil {
			return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to import contacts"})
		}
	}
	return c.JSON(http.StatusOK, echo.Map{"count": len(contacts)})
}

func (a *App) DeleteContact(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id := c.Param("id")
	if err := a.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&Contact{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to delete contact"})
	}
	return c.NoContent(http.StatusOK)
}

func (a *App) GetDesigns(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var designs []SavedDesign
	if err := a.DB.Where("user_id = ?", userID).Find(&designs).Error; err != nil {
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
	var design SavedDesign
	if err := c.Bind(&design); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}
	design.UserID = userID
	design.CreatedAt = time.Now()

	if err := a.DB.Create(&design).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to save design"})
	}
	return c.JSON(http.StatusOK, design)
}

func (a *App) DeleteDesign(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id := c.Param("id")
	if err := a.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&SavedDesign{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to delete design"})
	}
	return c.NoContent(http.StatusOK)
}

func (a *App) UploadFile(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "No file uploaded"})
	}

	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to open file"})
	}
	defer src.Close()

	// Read into memory
	buf := make([]byte, file.Size)
	if _, err := io.ReadFull(src, buf); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to read file"})
	}

	if a.MinioClient == nil {
		return c.JSON(http.StatusServiceUnavailable, echo.Map{"error": "Storage not configured"})
	}

	filename := fmt.Sprintf("upload-%d-%d-%s", userID, time.Now().Unix(), file.Filename)
	uploadedFilename, err := a.MinioClient.UploadFile(filename, buf, file.Header.Get("Content-Type"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to upload"})
	}

	fullURL := a.constructPublicURL(c, uploadedFilename, a.MinioClient.BucketName)
	return c.JSON(http.StatusOK, echo.Map{"url": fullURL})
}

func (a *App) HandleGetImage(c echo.Context) error {
	bucket := c.Param("bucket")
	filename := c.Param("filename")

	// Simple proxy or redirect?
	// For now, redirect to MinIO if public, or serve via MinIO client
	// Since MinioClient.UploadFile returns a public URL if configured,
	// this endpoint might be a fallback or proxy.
	// Let's implement a simple proxy if needed, or just 404.
	// But lines 226 imply it's used.
	return c.Redirect(http.StatusTemporaryRedirect, fmt.Sprintf("http://localhost:9000/%s/%s", bucket, filename))
}

func (a *App) ListDomains(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var domains []UserDomain
	if err := a.DB.Where("user_id = ?", userID).Find(&domains).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to fetch domains"})
	}

	// Auto-sync status for pending domains
	// This ensures that if a user verifies externally (or DNS propagates), the app reflects it.
	// We only check non-verified domains to avoid rate limits.
	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	for i, d := range domains {
		shouldSync := d.Status != "verified"

		// If verified but records show "not_started" or "pending", force sync
		if !shouldSync && (strings.Contains(d.DNSRecords, "not_started") || strings.Contains(d.DNSRecords, "pending")) {
			shouldSync = true
		}

		if shouldSync {
			// Fetch latest status from Resend
			rDomain, err := client.Domains.Get(d.ResendID)
			if err == nil {
				// Always update local DB if we fetched successfully, to ensure records are fresh
				// even if status string hasn't changed (e.g. domain verified, but records updated)

				// Update response object
				domains[i].Status = rDomain.Status
				domains[i].Region = rDomain.Region
				recordsBytes, _ := json.Marshal(rDomain.Records)
				domains[i].DNSRecords = string(recordsBytes)

				// Update DB
				a.DB.Model(&UserDomain{}).Where("id = ?", d.ID).Updates(map[string]interface{}{
					"status":      rDomain.Status,
					"region":      rDomain.Region,
					"dns_records": string(recordsBytes),
				})
			}
		}
	}

	return c.JSON(http.StatusOK, domains)
}

func (a *App) RegisterDomain(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var input struct {
		DomainName string `json:"domainName"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	var domain UserDomain

	params := &resend.CreateDomainRequest{
		Name: input.DomainName,
	}

	resp, err := client.Domains.Create(params)
	if err != nil {
		// If domain is already registered, try to recover it by fetching existing details
		if strings.Contains(strings.ToLower(err.Error()), "registered already") {
			// 1. List domains to find the ID
			listResp, listErr := client.Domains.List()
			if listErr != nil {
				return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Domain exists but failed to list: " + listErr.Error()})
			}

			var existingID string
			for _, d := range listResp.Data {
				if d.Name == input.DomainName {
					existingID = d.Id
					break
				}
			}

			if existingID == "" {
				return c.JSON(http.StatusConflict, echo.Map{"error": "Domain is registered to another account"})
			}

			// 2. Get full domain details
			existingDomain, getErr := client.Domains.Get(existingID)
			if getErr != nil {
				return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to retrieve existing domain: " + getErr.Error()})
			}

			// 3. Populate local model
			domain = UserDomain{
				UserID:      userID,
				DomainName:  input.DomainName,
				ResendID:    existingDomain.Id,
				Status:      existingDomain.Status,
				Region:      existingDomain.Region,
				HasTracking: true,
				CreatedAt:   time.Now(),
			}
			recordsBytes, _ := json.Marshal(existingDomain.Records)
			domain.DNSRecords = string(recordsBytes)

		} else {
			return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
		}
	} else {
		// Created successfully
		domain = UserDomain{
			UserID:      userID,
			DomainName:  input.DomainName,
			ResendID:    resp.Id,
			Status:      "pending",
			Region:      "us-east-1",
			HasTracking: true,
			CreatedAt:   time.Now(),
		}
		recordsBytes, _ := json.Marshal(resp.Records)
		domain.DNSRecords = string(recordsBytes)
	}

	// Check if we already have this domain locally (edge case)
	var count int64
	a.DB.Model(&UserDomain{}).Where("user_id = ? AND domain_name = ?", userID, input.DomainName).Count(&count)
	if count == 0 {
		if err := a.DB.Create(&domain).Error; err != nil {
			return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to save domain locally"})
		}
	} else {
		// Update existing local record just in case
		a.DB.Model(&UserDomain{}).Where("user_id = ? AND domain_name = ?", userID, input.DomainName).Updates(domain)
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

	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	resp, err := client.Domains.Get(domain.ResendID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	domain.Status = resp.Status
	a.DB.Save(&domain)

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

	// Trigger verification
	resp, err := client.Domains.Verify(domain.ResendID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	// Immediately fetch latest status to update local DB
	// This ensures the UI reflects the new state immediately
	domainDetails, getErr := client.Domains.Get(domain.ResendID)
	if getErr == nil {
		domain.Status = domainDetails.Status
		domain.Region = domainDetails.Region
		recordsBytes, _ := json.Marshal(domainDetails.Records)
		domain.DNSRecords = string(recordsBytes)
		a.DB.Save(&domain)
	}

	return c.JSON(http.StatusOK, resp)
}

func (a *App) DeleteDomain(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id := c.Param("id")
	var domain UserDomain
	if err := a.DB.Where("id = ? AND user_id = ?", id, userID).First(&domain).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Domain not found"})
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	client.Domains.Remove(domain.ResendID)
	a.DB.Delete(&domain)

	return c.NoContent(http.StatusOK)
}

func (a *App) SendEmail(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var req struct {
		Subject    string   `json:"subject"`
		HTML       string   `json:"html"`
		Recipients []string `json:"recipients"` // List of emails
		DomainID   uint     `json:"domainId"`
		From       string   `json:"from"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid input"})
	}

	var sender string

	if req.DomainID > 0 {
		var domain UserDomain
		if err := a.DB.Where("id = ? AND user_id = ?", req.DomainID, userID).First(&domain).Error; err != nil {
			return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid domain"})
		}
		// Prefer user-defined 'From' if provided, otherwise default to "Domain <info@domain>"
		if req.From != "" {
			// Basic security check: ensure the email part actually belongs to the authorized domain
			// The frontend sends "Name <prefix@domain.com>", so we check if it contains "@domain.com"
			if strings.Contains(req.From, "@"+domain.DomainName) {
				sender = req.From
			} else {
				// Fallback if they try to spoof another domain
				sender = fmt.Sprintf("%s <info@%s>", domain.DomainName, domain.DomainName)
			}
		} else {
			sender = fmt.Sprintf("%s <info@%s>", domain.DomainName, domain.DomainName)
		}
	} else {
		// Sandbox Mode (General Domain)
		if req.From != "" {
			sender = req.From
		} else {
			sender = "Updateer AI <onboarding@resend.dev>"
		}
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		fmt.Println("Error: RESEND_API_KEY is missing")
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Server configuration error: Missing API Key"})
	}
	client := resend.NewClient(apiKey)
	appURL := os.Getenv("APP_URL")

	for _, recipient := range req.Recipients {
		unsubscribeURL := fmt.Sprintf("%s/api/v1/unsubscribe?email=%s", appURL, recipient)

		params := &resend.SendEmailRequest{
			From:    sender,
			To:      []string{recipient},
			Subject: req.Subject,
			Html:    req.HTML,
			Headers: map[string]string{
				"List-Unsubscribe":      fmt.Sprintf("<%s>", unsubscribeURL),
				"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
			},
		}

		sent, err := client.Emails.Send(params)
		if err != nil {
			fmt.Printf("Error sending email to %s: %v\n", recipient, err)
			return c.JSON(http.StatusInternalServerError, echo.Map{"error": fmt.Sprintf("Failed to send email to %s: %v", recipient, err)})
		}

		a.DB.Create(&SentEmail{
			ResendID:  sent.Id,
			UserID:    userID,
			Status:    "sent",
			Subject:   req.Subject,
			Recipient: recipient,
			CreatedAt: time.Now(),
		})
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "Emails sent"})
}

func (a *App) HandleUnsubscribe(c echo.Context) error {
	email := c.QueryParam("email")
	if email == "" {
		return c.String(http.StatusBadRequest, "Email required")
	}
	a.DB.Create(&UnsubscribedUser{Email: email, CreatedAt: time.Now()})
	return c.String(http.StatusOK, "Unsubscribed successfully")
}

func (a *App) HandleUnsubscribeOneClick(c echo.Context) error {
	var req struct {
		Email string `json:"email"`
	}
	c.Bind(&req)
	if req.Email != "" {
		a.DB.Create(&UnsubscribedUser{Email: req.Email, CreatedAt: time.Now()})
	}
	return c.NoContent(http.StatusOK)
}

func (a *App) HandleSelarWebhook(c echo.Context) error {
	// Log the payload for now
	body, _ := io.ReadAll(c.Request().Body)
	fmt.Printf("Selar Webhook: %s\n", string(body))
	return c.NoContent(http.StatusOK)
}

func (a *App) AdminCreditUser(c echo.Context) error {
	key := c.QueryParam("key")
	if key != os.Getenv("ADMIN_SECRET_KEY") {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Unauthorized"})
	}

	email := c.QueryParam("email")
	action := c.QueryParam("action")

	var user User
	if err := a.DB.Preload("Profile").Where("email = ?", email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "User not found"})
	}

	profile := user.Profile

	switch action {
	case "starter":
		profile.Credits += 3000
		profile.CampaignCredits += 100
	case "undo_starter":
		profile.Credits -= 3000
		profile.CampaignCredits -= 100
	case "bulk":
		profile.Credits += 6000
		profile.CampaignCredits += 200
	case "undo_bulk":
		profile.Credits -= 6000
		profile.CampaignCredits -= 200
	case "mega_topup":
		profile.Credits += 30000
		profile.CampaignCredits += 1000
	case "undo_mega_topup":
		profile.Credits -= 30000
		profile.CampaignCredits -= 1000
	case "sub":
		profile.Credits += 700
		profile.CampaignCredits += 50
		profile.IsSubscribed = true
		profile.SubscriptionTier = "Pro"
		now := time.Now()
		expiry := now.AddDate(0, 1, 0)
		profile.SubscriptionExpiresAt = &expiry
	case "undo_sub":
		profile.Credits -= 700
		profile.CampaignCredits -= 50
		profile.IsSubscribed = false
		profile.SubscriptionTier = "Free"
		profile.SubscriptionExpiresAt = nil
	}

	a.DB.Save(&profile)
	return c.JSON(http.StatusOK, echo.Map{"message": "Credited"})
}

func (a *App) AdminListUsers(c echo.Context) error {
	var users []User
	a.DB.Preload("Profile").Find(&users)
	return c.JSON(http.StatusOK, users)
}

func (a *App) AdminGetUser(c echo.Context) error {
	id := c.QueryParam("id")
	var user User
	a.DB.Preload("Profile").First(&user, id)
	return c.JSON(http.StatusOK, user)
}

func (a *App) AdminResetPassword(c echo.Context) error {
	return c.NoContent(http.StatusOK)
}

func (a *App) InitResendWebhook(c echo.Context) error {
	go a.AutoRegisterWebhook()
	return c.JSON(http.StatusOK, echo.Map{"message": "Webhook registration initiated"})
}

func (a *App) HandleResendWebhook(c echo.Context) error {
	secret := os.Getenv("RESEND_WEBHOOK_SECRET")
	if secret == "" {
		fmt.Println("RESEND_WEBHOOK_SECRET is not set")
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Webhook secret not configured"})
	}

	payload, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Failed to read payload"})
	}

	headers := c.Request().Header
	wh, err := svix.NewWebhook(secret)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to create webhook verifier"})
	}

	if err := wh.Verify(payload, headers); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid signature"})
	}

	var event ResendWebhookPayload
	if err := json.Unmarshal(payload, &event); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid JSON"})
	}

	if event.Data.EmailID != "" {
		var email SentEmail
		if err := a.DB.Where("resend_id = ?", event.Data.EmailID).First(&email).Error; err == nil {
			priorities := map[string]int{
				"sent":            1,
				"email.sent":      1,
				"email.delivered": 2,
				"email.opened":    3,
				"email.clicked":   4,
			}

			currP := priorities[email.Status]
			newP := priorities[event.Type]

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

	tx := a.DB.Model(&SentEmail{}).Where("user_id = ?", userID)

	tx.Count(&totalSent)
	tx.Where("status IN ?", []string{"email.delivered", "email.opened", "email.clicked"}).Count(&delivered)
	tx.Where("status IN ?", []string{"email.opened", "email.clicked"}).Count(&opened)
	tx.Where("status IN ?", []string{"email.clicked"}).Count(&clicked)
	tx.Where("status = ?", "email.bounced").Count(&bounced)
	tx.Where("status = ?", "email.complained").Count(&complained)

	if opened > delivered {
		delivered = opened
	}
	if clicked > opened {
		opened = clicked
	}
	if clicked > delivered {
		delivered = clicked
	}

	summary := []map[string]interface{}{
		{"name": "Total Sent", "value": totalSent, "color": "#64748b"},
		{"name": "Complaints", "value": complained, "color": "#ef4444"},
	}

	return c.JSON(http.StatusOK, summary)
}

func (a *App) GetAnalyticsPerformance(c echo.Context) error {
	userID := c.Get("user_id").(uint)

	type DailyStat struct {
		DateStr string
		Opens   int
		Clicks  int
	}

	statsMap := make(map[string]*DailyStat)
	var orderedDates []string

	now := time.Now()
	for i := 6; i >= 0; i-- {
		d := now.AddDate(0, 0, -i)
		dateKey := d.Format("2006-01-02")
		displayDate := d.Format("Mon")

		statsMap[dateKey] = &DailyStat{DateStr: displayDate, Opens: 0, Clicks: 0}
		orderedDates = append(orderedDates, dateKey)
	}

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

	var result []map[string]interface{}
	for _, dateKey := range orderedDates {
		s := statsMap[dateKey]
		result = append(result, map[string]interface{}{
			"date":   s.DateStr,
			"opens":  s.Opens,
			"clicks": s.Clicks,
		})
	}

	return c.JSON(http.StatusOK, result)
}

func (a *App) CreateResendApiKey(c echo.Context) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "RESEND_API_KEY not set"})
	}

	client := resend.NewClient(apiKey)

	name := c.FormValue("name")
	if name == "" {
		name = "Production"
	}

	params := &resend.CreateApiKeyRequest{
		Name: name,
	}

	resp, err := client.ApiKeys.Create(params)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, resp)
}
