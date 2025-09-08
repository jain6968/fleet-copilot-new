export default function Card({ title, children }:{ title?: string; children: any }){
  return (
    <div className="bg-white rounded border shadow-sm p-4">
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      {children}
    </div>
  );
}
