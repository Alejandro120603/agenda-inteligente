interface EventCardProps {
  time: string;
  title: string;
  icon?: string;
  location?: string;
  description?: string;
  tag?: string;
}

export default function EventCard({
  time,
  title,
  icon = "🗓️",
  location,
  description,
  tag,
}: EventCardProps) {
  return (
    <article className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
        {icon}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-base font-semibold text-gray-900">{title}</h4>
          {tag ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
              {tag}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-medium text-gray-500">{time}</p>
        {location ? (
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-600">Lugar:</span> {location}
          </p>
        ) : null}
        {description ? <p className="mt-2 text-sm text-gray-600">{description}</p> : null}
      </div>
    </article>
  );
}
