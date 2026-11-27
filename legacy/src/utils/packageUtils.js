// utils/packageUtils.js
export const parseName = (name = "") => {
  const parts = name
    .split(/[-()]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { main: parts[0] || name, bonus: parts[1] || "" };
};
