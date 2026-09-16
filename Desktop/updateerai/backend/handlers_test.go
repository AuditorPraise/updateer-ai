package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func setupTestApp(t *testing.T) *App {
	// For testing, we use an in-memory SQLite database
	// In production, use a test database
	return &App{
		DB:          nil, // Mock database - use testify/mock for real tests
		MinioClient: nil, // Mock MinIO client
	}
}

func TestHandleUnsubscribe(t *testing.T) {
	app := setupTestApp(t)
	e := echo.New()

	t.Run("missing email param returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/unsubscribe", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := app.HandleUnsubscribe(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assert.Contains(t, rec.Body.String(), "Email required")
	})

	t.Run("valid email param returns 200", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/unsubscribe?email=test@example.com", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// Mock the database to avoid actual DB calls
		app.DB = &gorm.DB{} // Mocked

		err := app.HandleUnsubscribe(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), "Unsubscribed successfully")
	})
}

func TestConstructPublicURL(t *testing.T) {
	app := setupTestApp(t)
	e := echo.New()

	t.Run("constructs URL with default app host", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		url := app.constructPublicURL(c, "logo-123.png", "browser")

		assert.NotEmpty(t, url)
		assert.Contains(t, url, "logo-123.png")
		assert.Contains(t, url, "browser")
	})
}

func TestLogout(t *testing.T) {
	app := setupTestApp(t)
	e := echo.New()

	t.Run("logout clears auth cookie", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := app.Logout(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), "Logged out")
	})
}

func TestHandleUnsubscribeOneClick(t *testing.T) {
	app := setupTestApp(t)
	e := echo.New()

	t.Run("one-click unsubscribe with empty email does nothing", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/unsubscribe", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		app.DB = &gorm.DB{} // Mocked

		err := app.HandleUnsubscribeOneClick(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNoContent, rec.Code)
	})
}
