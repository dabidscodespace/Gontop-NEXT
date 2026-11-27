// src/pages/Settings.jsx

import React, { useState, useEffect } from "react";
import { useShop } from "../context/ShopContext";
import { updateCustomerProfile } from "../api/services/auth";

const Settings = () => {
  const { user, isAuthenticated, loading, logout, updateUser, navigate, openLoginPopup } = useShop();

  const [formLoading, setFormLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    display_name: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    customer_id: "",
    picture: null,
    date_created: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      openLoginPopup();
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, loading, navigate, openLoginPopup]);

  // Load user data from context
  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        email: user.email || "",
        customer_id: user.customer_id || "",
        picture: user.picture || null,
        date_created: user.date_created || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");
    setSuccess(false);

    try {
      const updatedData = await updateCustomerProfile(formData.customer_id, {
        display_name: formData.display_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      });

      // Update context with new user data
      updateUser(updatedData);
      setSuccess(true);

      // Auto hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-orange border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-primary mb-4 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-primary">Profile Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-accent-orange to-orange-400 px-6 py-8">
            <div className="flex items-center gap-4">
              {/* Profile Picture */}
              <div className="relative">
                {formData.picture ? (
                  <img
                    src={formData.picture}
                    alt="Profile"
                    className="w-20 h-20 rounded-full border-4 border-white object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {formData.display_name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                {/* Edit badge */}
                <button className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </button>
              </div>

              <div className="text-white flex-1">
                <h2 className="text-xl font-bold">
                  {formData.display_name || "User"}
                </h2>
                <p className="text-white/80 text-sm">{formData.email}</p>
                <p className="text-white/60 text-xs mt-1">
                  Member since {formatDate(formData.date_created)}
                </p>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-fadeIn">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Profile updated successfully!
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-fadeIn">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            {/* Read-only Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.customer_id}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">
                  Editable Information
                </span>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Display Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  placeholder="Enter display name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent-orange focus:border-accent-orange transition-all outline-none"
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent-orange focus:border-accent-orange transition-all outline-none"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent-orange focus:border-accent-orange transition-all outline-none"
                />
              </div>

              {/* Phone Number */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    +88
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    maxLength={10}
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent-orange focus:border-accent-orange transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-accent-orange hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Account Info Card */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">
            Account Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Account Status</span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Member Since</span>
              <span className="text-primary font-medium">
                {formatDate(formData.date_created)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Login Method</span>
              <span className="flex items-center gap-2 text-primary font-medium">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;