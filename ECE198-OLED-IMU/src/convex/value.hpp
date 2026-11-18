#pragma once

#include <string>
#include <vector>
#include <map>
#include <variant>
#include <cstdint>
#include <memory>
#include <sstream>
#include <type_traits>

namespace convex {

// Forward declaration
class Value;

// Type aliases for Convex value types
using Null = std::monostate;
using Int64 = int64_t;
using Float64 = double;
using Boolean = bool;
using String = std::string;
using Bytes = std::vector<uint8_t>;
using Array = std::vector<Value>;
using Object = std::map<std::string, Value>;

/**
 * A value that can be passed as an argument or returned from Convex functions.
 * Corresponds to the supported Convex types:
 * https://docs.convex.dev/database/types
 */
class Value {
public:
    enum class Type {
        Null,
        Int64,
        Float64,
        Boolean,
        String,
        Bytes,
        Array,
        Object
    };

    // Constructors
    Value() : data_(Null{}) {}
    Value(std::nullptr_t) : data_(Null{}) {}
    
    // Integer constructors - handle various integer types
    template<typename T, typename = std::enable_if_t<
        std::is_integral_v<T> && !std::is_same_v<T, bool>>>
    Value(T v) : data_(static_cast<int64_t>(v)) {}
    
    // Float constructor
    Value(double v) : data_(v) {}
    Value(float v) : data_(static_cast<double>(v)) {}
    
    // Boolean constructor (explicit to avoid implicit conversions)
    explicit Value(bool v) : data_(v) {}
    
    // String constructors
    Value(const char* v) : data_(std::string(v)) {}
    Value(std::string v) : data_(std::move(v)) {}
    
    // Container constructors
    Value(Bytes v) : data_(std::move(v)) {}
    Value(Array v) : data_(std::move(v)) {}
    Value(Object v) : data_(std::move(v)) {}
    
    // Initializer list constructors
    Value(std::initializer_list<Value> list) : data_(Array(list)) {}
    Value(std::initializer_list<std::pair<const std::string, Value>> list) 
        : data_(Object(list)) {}

    // Type checking
    Type type() const;
    bool is_null() const { return std::holds_alternative<Null>(data_); }
    bool is_int64() const { return std::holds_alternative<Int64>(data_); }
    bool is_float64() const { return std::holds_alternative<Float64>(data_); }
    bool is_boolean() const { return std::holds_alternative<Boolean>(data_); }
    bool is_string() const { return std::holds_alternative<String>(data_); }
    bool is_bytes() const { return std::holds_alternative<Bytes>(data_); }
    bool is_array() const { return std::holds_alternative<Array>(data_); }
    bool is_object() const { return std::holds_alternative<Object>(data_); }

    // Accessors (throw if wrong type)
    int64_t as_int64() const;
    double as_float64() const;
    bool as_boolean() const;
    const std::string& as_string() const;
    const Bytes& as_bytes() const;
    const Array& as_array() const;
    const Object& as_object() const;
    
    // Mutable accessors
    Array& as_array_mut();
    Object& as_object_mut();

    // Array access
    const Value& operator[](size_t index) const;
    Value& operator[](size_t index);
    
    // Object access
    const Value& operator[](const std::string& key) const;
    Value& operator[](const std::string& key);
    bool contains(const std::string& key) const;

    // Comparison
    bool operator==(const Value& other) const;
    bool operator!=(const Value& other) const { return !(*this == other); }

    // String representation
    std::string to_string() const;
    
    // Get raw variant (for advanced use)
    const auto& raw() const { return data_; }

private:
    std::variant<Null, Int64, Float64, Boolean, String, Bytes, Array, Object> data_;
};

// Helper function to create an object from key-value pairs
inline Object make_object(std::initializer_list<std::pair<const std::string, Value>> list) {
    return Object(list);
}

// Helper function to create an array
inline Array make_array(std::initializer_list<Value> list) {
    return Array(list);
}

} // namespace convex
