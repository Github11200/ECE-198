#pragma once

#include <string>
#include <stdexcept>

namespace convex {

/**
 * Base class for all Convex errors
 */
class ConvexException : public std::runtime_error {
public:
    explicit ConvexException(const std::string& message)
        : std::runtime_error(message) {}
};

/**
 * Connection-related errors
 */
class ConnectionError : public ConvexException {
public:
    explicit ConnectionError(const std::string& message)
        : ConvexException("Connection error: " + message) {}
};

/**
 * Protocol-related errors (invalid messages, etc.)
 */
class ProtocolError : public ConvexException {
public:
    explicit ProtocolError(const std::string& message)
        : ConvexException("Protocol error: " + message) {}
};

/**
 * JSON parsing/serialization errors
 */
class JsonError : public ConvexException {
public:
    explicit JsonError(const std::string& message)
        : ConvexException("JSON error: " + message) {}
};

/**
 * Authentication errors
 */
class AuthError : public ConvexException {
public:
    explicit AuthError(const std::string& message)
        : ConvexException("Auth error: " + message) {}
};

/**
 * Application-level error from Convex function
 * Corresponds to ConvexError in Rust
 */
class FunctionError : public ConvexException {
public:
    std::string data;  // Custom error data payload (JSON string)
    
    FunctionError(const std::string& message, const std::string& error_data = "")
        : ConvexException(message), data(error_data) {}
};

/**
 * Result type for operations that can fail
 * Similar to Rust's Result<T, E>
 */
template<typename T>
class Result {
public:
    Result(T value) : value_(std::move(value)), has_value_(true) {}
    Result(ConvexException error) : error_(std::move(error)), has_value_(false) {}
    
    bool ok() const { return has_value_; }
    bool is_error() const { return !has_value_; }
    
    T& value() {
        if (!has_value_) throw error_;
        return value_;
    }
    
    const T& value() const {
        if (!has_value_) throw error_;
        return value_;
    }
    
    const ConvexException& error() const { return error_; }
    
    T value_or(T default_value) const {
        return has_value_ ? value_ : default_value;
    }

private:
    T value_;
    ConvexException error_{""};
    bool has_value_;
};

// Specialization for void
template<>
class Result<void> {
public:
    Result() : has_value_(true) {}
    Result(ConvexException error) : error_(std::move(error)), has_value_(false) {}
    
    bool ok() const { return has_value_; }
    bool is_error() const { return !has_value_; }
    
    void value() const {
        if (!has_value_) throw error_;
    }
    
    const ConvexException& error() const { return error_; }

private:
    ConvexException error_{""};
    bool has_value_;
};

} // namespace convex
