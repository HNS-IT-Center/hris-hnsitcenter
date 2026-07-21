const fs = require('fs');
let content = fs.readFileSync('components/hris/pages/hrd-attendance-logs.tsx', 'utf-8');

// The h1 header is here
const searchString = `<h1 className="text-xl font-bold text-foreground">Log Absensi Karyawan</h1>`;
const replacementString = `<div className="flex items-center gap-4"><h1 className="text-xl font-bold text-foreground">Log Absensi Karyawan</h1>\n          <div className="flex bg-muted p-1 rounded-lg">\n            <button onClick={() => setViewMode("table")} className={\`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all \${viewMode === "table" ? "bg-background shadow text-foreground" : "text-muted-foreground"}\`}>\n              <Table className="h-4 w-4" /> Tabel\n            </button>\n            <button onClick={() => setViewMode("map")} className={\`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all \${viewMode === "map" ? "bg-background shadow text-foreground" : "text-muted-foreground"}\`}>\n              <Map className="h-4 w-4" /> Peta\n            </button>\n          </div></div>`;

if (content.includes(searchString)) {
  content = content.replace(searchString, replacementString);
  fs.writeFileSync('components/hris/pages/hrd-attendance-logs.tsx', content);
  console.log("Successfully added map toggle next to h1");
} else {
  console.log("Could not find the h1 string");
}
