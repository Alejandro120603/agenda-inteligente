function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-lg font-semibold text-white shadow-lg">
        AI
      </span>
    </div>
  );
}

export default Logo;
