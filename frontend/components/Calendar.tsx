const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

function buildCalendarDates(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const startOffset = (firstDay.getDay() + 6) % 7; // Convertir domingo=0 a lunes=0
  const totalDays = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) {
    days.push(null);
  }
  for (let day = 1; day <= totalDays; day += 1) {
    days.push(day);
  }

  const remainder = days.length % 7;
  if (remainder !== 0) {
    for (let i = remainder; i < 7; i += 1) {
      days.push(null);
    }
  }

  return days;
}

export default function Calendar() {
  const today = new Date();
  const monthLabel = today.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const days = buildCalendarDates(today);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-500">Calendario</p>
          <h3 className="text-xl font-semibold capitalize text-gray-900">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 font-medium text-indigo-600">
            ● Hoy
          </span>
        </div>
      </header>
      <div className="grid grid-cols-7 gap-2 text-center text-sm">
        {weekDays.map((day) => (
          <span key={day} className="font-semibold uppercase tracking-wide text-gray-400">
            {day}
          </span>
        ))}
        {days.map((day, index) => {
          const isToday = day === today.getDate();
          return (
            <div
              key={`${day ?? "empty"}-${index}`}
              className={`flex h-12 items-center justify-center rounded-xl border text-sm transition ${
                day
                  ? isToday
                    ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-600"
                    : "border-transparent bg-gray-50 text-gray-700 hover:border-indigo-200"
                  : "border-transparent"
              }`}
            >
              {day ?? ""}
            </div>
          );
        })}
      </div>
    </section>
  );
}
