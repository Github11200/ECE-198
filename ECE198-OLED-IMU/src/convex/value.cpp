#include "value.hpp"
#include <stdexcept>
#include <sstream>
#include <iomanip>

namespace convex {

Value::Type Value::type() const {
    return std::visit([](auto&& arg) -> Type {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, Null>) return Type::Null;
        else if constexpr (std::is_same_v<T, Int64>) return Type::Int64;
        else if constexpr (std::is_same_v<T, Float64>) return Type::Float64;
        else if constexpr (std::is_same_v<T, Boolean>) return Type::Boolean;
        else if constexpr (std::is_same_v<T, String>) return Type::String;
        else if constexpr (std::is_same_v<T, Bytes>) return Type::Bytes;
        else if constexpr (std::is_same_v<T, Array>) return Type::Array;
        else if constexpr (std::is_same_v<T, Object>) return Type::Object;
        else return Type::Null; // unreachable
    }, data_);
}

int64_t Value::as_int64() const {
    if (auto* v = std::get_if<Int64>(&data_)) return *v;
    throw std::runtime_error("Value is not Int64");
}

double Value::as_float64() const {
    if (auto* v = std::get_if<Float64>(&data_)) return *v;
    throw std::runtime_error("Value is not Float64");
}

bool Value::as_boolean() const {
    if (auto* v = std::get_if<Boolean>(&data_)) return *v;
    throw std::runtime_error("Value is not Boolean");
}

const std::string& Value::as_string() const {
    if (auto* v = std::get_if<String>(&data_)) return *v;
    throw std::runtime_error("Value is not String");
}

const Bytes& Value::as_bytes() const {
    if (auto* v = std::get_if<Bytes>(&data_)) return *v;
    throw std::runtime_error("Value is not Bytes");
}

const Array& Value::as_array() const {
    if (auto* v = std::get_if<Array>(&data_)) return *v;
    throw std::runtime_error("Value is not Array");
}

const Object& Value::as_object() const {
    if (auto* v = std::get_if<Object>(&data_)) return *v;
    throw std::runtime_error("Value is not Object");
}

Array& Value::as_array_mut() {
    if (auto* v = std::get_if<Array>(&data_)) return *v;
    throw std::runtime_error("Value is not Array");
}

Object& Value::as_object_mut() {
    if (auto* v = std::get_if<Object>(&data_)) return *v;
    throw std::runtime_error("Value is not Object");
}

const Value& Value::operator[](size_t index) const {
    return as_array().at(index);
}

Value& Value::operator[](size_t index) {
    return as_array_mut().at(index);
}

const Value& Value::operator[](const std::string& key) const {
    const auto& obj = as_object();
    auto it = obj.find(key);
    if (it == obj.end()) {
        throw std::runtime_error("Key not found: " + key);
    }
    return it->second;
}

Value& Value::operator[](const std::string& key) {
    return as_object_mut()[key];
}

bool Value::contains(const std::string& key) const {
    if (!is_object()) return false;
    return as_object().count(key) > 0;
}

bool Value::operator==(const Value& other) const {
    return data_ == other.data_;
}

std::string Value::to_string() const {
    return std::visit([](auto&& arg) -> std::string {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, Null>) {
            return "null";
        } else if constexpr (std::is_same_v<T, Int64>) {
            return std::to_string(arg);
        } else if constexpr (std::is_same_v<T, Float64>) {
            std::ostringstream oss;
            oss << std::setprecision(17) << arg;
            return oss.str();
        } else if constexpr (std::is_same_v<T, Boolean>) {
            return arg ? "true" : "false";
        } else if constexpr (std::is_same_v<T, String>) {
            return "\"" + arg + "\"";
        } else if constexpr (std::is_same_v<T, Bytes>) {
            std::ostringstream oss;
            oss << "Bytes[" << arg.size() << "]";
            return oss.str();
        } else if constexpr (std::is_same_v<T, Array>) {
            std::ostringstream oss;
            oss << "[";
            for (size_t i = 0; i < arg.size(); ++i) {
                if (i > 0) oss << ", ";
                oss << arg[i].to_string();
            }
            oss << "]";
            return oss.str();
        } else if constexpr (std::is_same_v<T, Object>) {
            std::ostringstream oss;
            oss << "{";
            bool first = true;
            for (const auto& [key, value] : arg) {
                if (!first) oss << ", ";
                first = false;
                oss << "\"" << key << "\": " << value.to_string();
            }
            oss << "}";
            return oss.str();
        } else {
            return "unknown";
        }
    }, data_);
}

} // namespace convex
