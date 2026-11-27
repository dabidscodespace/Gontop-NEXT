export default function Footer() {
  return (
    <footer
      className="
        w-full text-center py-6
        text-gray-400 text-sm
      "
    >
      <div className="flex flex-wrap justify-center items-center gap-3 mb-2">
        <a href="#" className="hover:text-accent-orange transition-colors">
          User Agreement
        </a>
        <span className="text-text-muted">|</span>
        <a href="#" className="hover:text-accent-orange transition-colors">
          Privacy Policy
        </a>
        <span className="text-text-muted">|</span>
        <a href="#" className="hover:text-accent-orange transition-colors">
          Contact us
        </a>
      </div>

      <p className="text-xs text-text-muted">
        Copyright © 2010 - 2026{" "}
        <span className="text-accent-orange font-semibold">GONTOP</span>. All Rights Reserved
      </p>
    </footer>
  );
}