#pragma once

#include <string>
#include <stdexcept>
#include <optional>

namespace convex {

/**
 * Maximum length for identifiers (table names, field names)
 */
constexpr size_t MAX_IDENTIFIER_LEN = 64;

/**
 * Check if a character is valid as the start of an identifier
 */
constexpr bool is_valid_identifier_start(char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
}

/**
 * Check if a character is valid within an identifier
 */
constexpr bool is_valid_identifier_char(char c) {
    return is_valid_identifier_start(c) || (c >= '0' && c <= '9');
}

/**
 * Check if a string is a valid identifier.
 * 
 * Identifiers must:
 * - Start with a letter or underscore
 * - Contain only letters, digits, and underscores
 * - Not be entirely underscores
 * - Be at most MAX_IDENTIFIER_LEN characters
 */
inline bool is_valid_identifier(const std::string& s) {
    if (s.empty() || s.length() > MAX_IDENTIFIER_LEN) {
        return false;
    }
    
    if (!is_valid_identifier_start(s[0])) {
        return false;
    }
    
    bool has_non_underscore = false;
    for (char c : s) {
        if (!is_valid_identifier_char(c)) {
            return false;
        }
        if (c != '_') {
            has_non_underscore = true;
        }
    }
    
    return has_non_underscore;
}

/**
 * Validate an identifier, throwing if invalid
 */
inline void check_valid_identifier(const std::string& s) {
    if (s.empty()) {
        throw std::invalid_argument("Identifier cannot be empty");
    }
    if (s.length() > MAX_IDENTIFIER_LEN) {
        throw std::invalid_argument(
            "Identifier too long: max " + std::to_string(MAX_IDENTIFIER_LEN) + " characters"
        );
    }
    if (!is_valid_identifier_start(s[0])) {
        throw std::invalid_argument(
            "Identifier must start with a letter or underscore: " + s
        );
    }
    
    bool has_non_underscore = false;
    for (size_t i = 0; i < s.length(); ++i) {
        char c = s[i];
        if (!is_valid_identifier_char(c)) {
            throw std::invalid_argument(
                "Invalid character '" + std::string(1, c) + "' in identifier: " + s
            );
        }
        if (c != '_') {
            has_non_underscore = true;
        }
    }
    
    if (!has_non_underscore) {
        throw std::invalid_argument(
            "Identifier cannot consist entirely of underscores: " + s
        );
    }
}

/**
 * A validated identifier (table name, field name)
 */
class Identifier {
public:
    /**
     * Create an identifier, validating the string
     * @throws std::invalid_argument if the string is not a valid identifier
     */
    explicit Identifier(const std::string& s) : value_(s) {
        check_valid_identifier(s);
    }
    
    /**
     * Try to create an identifier, returning nullopt if invalid
     */
    static std::optional<Identifier> try_from(const std::string& s) {
        if (is_valid_identifier(s)) {
            return Identifier(s);
        }
        return std::nullopt;
    }
    
    const std::string& str() const { return value_; }
    operator const std::string&() const { return value_; }
    
    bool operator==(const Identifier& other) const { return value_ == other.value_; }
    bool operator!=(const Identifier& other) const { return value_ != other.value_; }
    bool operator<(const Identifier& other) const { return value_ < other.value_; }
    
private:
    std::string value_;
};

} // namespace convex
