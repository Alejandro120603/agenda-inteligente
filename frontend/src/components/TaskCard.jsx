function TaskCard({ title }) {
  return (
    <article className="bg-white shadow-md hover:shadow-lg rounded-xl p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    </article>
  );
}

export default TaskCard;
