function EventCard({ title, time, description }) {
  return (
    <article className="bg-white shadow-md hover:shadow-lg rounded-xl p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-blue-600 font-medium mt-1">{time}</p>
        </div>
      </div>
      {description ? (
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">{description}</p>
      ) : null}
    </article>
  );
}

export default EventCard;
