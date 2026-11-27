// src/pages/NotFound.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import SEO from "../components/SEO";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO
        title="404 - Page Not Found"
        description="The page you are looking for doesn't exist."
        noindex={true}
      />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* 404 Illustration */}
          <div className="mb-8">
            <svg
              className="mx-auto h-64 w-64 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Content */}
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-500 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:border-gray-400 transition-colors font-medium"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-accent-orange text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
