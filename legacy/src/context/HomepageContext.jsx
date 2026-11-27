import { createContext, useContext } from "react";
import { useHomepageData } from "../hooks/useHomepageData";

const HomepageContext = createContext(null);

export function HomepageProvider({ children }) {
  const homepageData = useHomepageData();

  return (
    <HomepageContext.Provider value={homepageData}>
      {children}
    </HomepageContext.Provider>
  );
}

export function useHomepage() {
  const context = useContext(HomepageContext);
  if (!context) {
    throw new Error("useHomepage must be used within HomepageProvider");
  }
  return context;
}