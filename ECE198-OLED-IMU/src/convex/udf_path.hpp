#pragma once

#include "identifier.hpp"
#include <string>
#include <optional>
#include <stdexcept>

namespace convex {

/**
 * A function name within a module
 */
class FunctionName {
public:
    explicit FunctionName(const std::string& name) : name_(name) {
        if (name.empty()) {
            throw std::invalid_argument("Function name cannot be empty");
        }
        // Function names follow identifier rules
        check_valid_identifier(name);
    }
    
    static FunctionName default_export() {
        return FunctionName("default");
    }
    
    const std::string& str() const { return name_; }
    operator const std::string&() const { return name_; }
    
    bool operator==(const FunctionName& other) const { return name_ == other.name_; }
    bool operator!=(const FunctionName& other) const { return name_ != other.name_; }
    
private:
    std::string name_;
};

/**
 * A module path (e.g., "messages", "api/users", "_system/auth")
 */
class ModulePath {
public:
    explicit ModulePath(const std::string& path) : path_(path) {
        validate(path);
    }
    
    /**
     * Check if this is a system module (starts with _)
     */
    bool is_system() const {
        return !path_.empty() && path_[0] == '_';
    }
    
    /**
     * Get the canonicalized path (with .js extension if needed)
     */
    std::string canonicalize() const {
        if (path_.length() >= 3 && path_.substr(path_.length() - 3) == ".js") {
            return path_;
        }
        return path_ + ".js";
    }
    
    const std::string& str() const { return path_; }
    operator const std::string&() const { return path_; }
    
    bool operator==(const ModulePath& other) const { return path_ == other.path_; }
    bool operator!=(const ModulePath& other) const { return path_ != other.path_; }
    
private:
    static void validate(const std::string& path) {
        if (path.empty()) {
            throw std::invalid_argument("Module path cannot be empty");
        }
        
        // Check for invalid characters
        for (char c : path) {
            if (!is_valid_identifier_char(c) && c != '/' && c != '.') {
                throw std::invalid_argument(
                    "Invalid character in module path: " + std::string(1, c)
                );
            }
        }
        
        // Check for double slashes or leading/trailing slashes
        if (path[0] == '/' || path.back() == '/') {
            throw std::invalid_argument("Module path cannot start or end with /");
        }
        if (path.find("//") != std::string::npos) {
            throw std::invalid_argument("Module path cannot contain //");
        }
    }
    
    std::string path_;
};

/**
 * A path to a UDF (User-Defined Function), consisting of a module path
 * and an optional function name, separated by a colon.
 * 
 * Examples:
 *   "messages:list" - function "list" in module "messages"
 *   "api/users:get" - function "get" in module "api/users"
 *   "messages" - default export from module "messages"
 */
class UdfPath {
public:
    /**
     * Parse a UDF path string
     * @param path The path string (e.g., "messages:list")
     */
    explicit UdfPath(const std::string& path)
        : module_(parse_module(path)), function_(parse_function(path)) {}
    
private:
    static std::string parse_module_str(const std::string& path) {
        size_t colon_pos = path.rfind(':');
        if (colon_pos != std::string::npos) {
            return path.substr(0, colon_pos);
        }
        return path;
    }
    
    static ModulePath parse_module(const std::string& path) {
        return ModulePath(parse_module_str(path));
    }
    
    static std::optional<FunctionName> parse_function(const std::string& path) {
        size_t colon_pos = path.rfind(':');
        if (colon_pos != std::string::npos) {
            return FunctionName(path.substr(colon_pos + 1));
        }
        return std::nullopt;
    }
    
public:
    
    UdfPath(ModulePath module, std::optional<FunctionName> function)
        : module_(std::move(module)), function_(std::move(function)) {}
    
    /**
     * Get the module path
     */
    const ModulePath& module() const { return module_; }
    
    /**
     * Get the function name (if specified)
     */
    const std::optional<FunctionName>& function_name() const { return function_; }
    
    /**
     * Check if this is a system UDF
     */
    bool is_system() const { return module_.is_system(); }
    
    /**
     * Get the canonicalized path string
     */
    std::string canonicalize() const {
        std::string result = module_.canonicalize();
        // Remove .js extension for canonical form
        if (result.length() >= 3 && result.substr(result.length() - 3) == ".js") {
            result = result.substr(0, result.length() - 3);
        }
        result += ":";
        result += function_.has_value() ? function_->str() : "default";
        return result;
    }
    
    /**
     * Convert to string
     */
    std::string to_string() const {
        if (function_.has_value()) {
            return module_.str() + ":" + function_->str();
        }
        return module_.str();
    }
    
    operator std::string() const { return to_string(); }
    
    bool operator==(const UdfPath& other) const {
        return module_ == other.module_ && function_ == other.function_;
    }
    
private:
    ModulePath module_;
    std::optional<FunctionName> function_;
};

/**
 * A canonicalized UDF path where the function name is always explicit
 */
class CanonicalizedUdfPath {
public:
    CanonicalizedUdfPath(ModulePath module, FunctionName function)
        : module_(std::move(module)), function_(std::move(function)) {}
    
    static CanonicalizedUdfPath from_udf_path(const UdfPath& path) {
        return CanonicalizedUdfPath(
            path.module(),
            path.function_name().value_or(FunctionName::default_export())
        );
    }
    
    const ModulePath& module() const { return module_; }
    const FunctionName& function() const { return function_; }
    
    std::string to_string() const {
        return module_.str() + ":" + function_.str();
    }
    
    operator std::string() const { return to_string(); }
    
private:
    ModulePath module_;
    FunctionName function_;
};

} // namespace convex
