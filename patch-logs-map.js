const fs = require('fs');

let content = fs.readFileSync('components/hris/pages/hrd-attendance-logs.tsx', 'utf-8');

content = content.replace(
  `import { useRouter } from "next/navigation"`,
  `import { useRouter } from "next/navigation"\nimport { AttendanceMap } from "./attendance-map"\nimport { Map, Table } from "lucide-react"`
);

content = content.replace(
  `  const [deptFilter, setDeptFilter] = useState("Semua")`,
  `  const [viewMode, setViewMode] = useState<"table" | "map">("table")\n  const [deptFilter, setDeptFilter] = useState("Semua")`
);

content = content.replace(
  `          <h2 className="text-xl font-bold tracking-tight">Log Absensi Karyawan</h2>`,
  `          <div className="flex items-center gap-4"><h2 className="text-xl font-bold tracking-tight">Log Absensi Karyawan</h2>\n          <div className="flex bg-muted p-1 rounded-lg">\n            <button onClick={() => setViewMode("table")} className={\`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all \${viewMode === "table" ? "bg-background shadow text-foreground" : "text-muted-foreground"}\`}>\n              <Table className="h-4 w-4" /> Tabel\n            </button>\n            <button onClick={() => setViewMode("map")} className={\`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all \${viewMode === "map" ? "bg-background shadow text-foreground" : "text-muted-foreground"}\`}>\n              <Map className="h-4 w-4" /> Peta\n            </button>\n          </div></div>`
);

content = content.replace(
  `{/* Filters Row */}`,
  `{viewMode === "map" ? (\n        <AttendanceMap initialData={initialData} />\n      ) : (\n        <>\n      {/* Filters Row */}`
);

content = content.replace(
  `        </div>\n      )}\n    </div>\n  )\n}`,
  `        </div>\n      )}\n      </>\n      )}\n    </div>\n  )\n}`
);

fs.writeFileSync('components/hris/pages/hrd-attendance-logs.tsx', content);
console.log("HRD Attendance Logs patched with map toggle");
