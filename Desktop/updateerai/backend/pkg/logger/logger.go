package logger

import (
	"log/slog"
	"os"
)

var log *slog.Logger

func init() {
	level := slog.LevelInfo
	levelStr := os.Getenv("LOG_LEVEL")
	switch levelStr {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}

	opts := &slog.HandlerOptions{
		Level: level,
	}

	var handler slog.Handler
	if os.Getenv("LOG_FORMAT") == "json" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	log = slog.New(handler)
	slog.SetDefault(log)
}

// Info logs an info level message with key-value pairs
func Info(msg string, args ...any) {
	log.Info(msg, args...)
}

// Warn logs a warning level message with key-value pairs
func Warn(msg string, args ...any) {
	log.Warn(msg, args...)
}

// Error logs an error level message with key-value pairs
func Error(msg string, args ...any) {
	log.Error(msg, args...)
}

// Debug logs a debug level message with key-value pairs
func Debug(msg string, args ...any) {
	log.Debug(msg, args...)
}

// WithContext returns a logger with additional context attributes
func WithContext(attrs ...any) *slog.Logger {
	return log.With(attrs...)
}

// Fatal logs an error and exits the program
func Fatal(msg string, args ...any) {
	log.Error(msg, args...)
	os.Exit(1)
}
