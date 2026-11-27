// src/hooks/useLicenses.js
import { useCallback, useEffect, useState } from "react";
import { getCustomerLicenses } from "../api/api";

const useLicenses = (orders = []) => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLicenses = useCallback(async () => {
    if (!orders || orders.length === 0) {
      setLicenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCustomerLicenses(orders);

      const sortedLicenses = data.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA;
      });

      setLicenses(sortedLicenses);
    } catch (err) {
      // ✅ Only log safe message
      console.error("Error in useLicenses:", err.message);
      setError("Failed to fetch licenses");
    } finally {
      setLoading(false);
    }
  }, [orders]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  return {
    licenses,
    loading,
    error,
    refresh: fetchLicenses,
  };
};

export default useLicenses;