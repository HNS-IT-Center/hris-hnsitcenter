const fs = require('fs');
let content = fs.readFileSync('components/hris/pages/leave.tsx', 'utf-8');

// Add Search Icon to imports
content = content.replace(/X,\n  ExternalLink,/, "X,\n  ExternalLink,\n  Search,\n  ChevronLeft,");

// HrdView updates
content = content.replace(
  `function HrdView({ allRequests }: { allRequests: AllRequest[] }) {`,
  `function HrdView({ allRequests }: { allRequests: AllRequest[] }) {\n  const [search, setSearch] = useState("")\n  const [page, setPage] = useState(1)\n  const ITEMS_PER_PAGE = 15`
);

content = content.replace(
  `  const filtered = allRequests.filter(r => {`,
  `  const filtered = allRequests.filter(r => {\n    if (search) {\n      const s = search.toLowerCase()\n      if (!r.user.name.toLowerCase().includes(s) && !r.reason?.toLowerCase().includes(s) && !LEAVE_TYPE_CONFIG[r.type]?.label.toLowerCase().includes(s)) return false\n    }`
);

content = content.replace(
  `const isExpired = (endDate: Date) => Date.now() > new Date(endDate).getTime() + 86400000`,
  `const isExpired = (endDate: Date) => Date.now() > new Date(endDate).getTime() + 86400000\n  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)\n  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)`
);

content = content.replace(
  `      {/* Status filter tabs */}`,
  `      <div className="relative">\n        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />\n        <Input\n          placeholder="Cari nama, tipe, atau alasan..."\n          value={search}\n          onChange={(e) => { setSearch(e.target.value); setPage(1) }}\n          className="pl-9 bg-background"\n        />\n      </div>\n\n      {/* Status filter tabs */}`
);

content = content.replace(
  `onClick={() => setTab(s)}`,
  `onClick={() => { setTab(s); setPage(1); }}`
);

content = content.replace(
  `          {filtered.map((r) => {`,
  `          {paginated.map((r) => {`
);

content = content.replace(
  `        </div>\n      )}\n    </div>`,
  `        </div>\n      )}\n      {totalPages > 1 && (\n        <div className="flex items-center justify-between mt-6 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">\n          <Button\n            variant="outline"\n            size="sm"\n            onClick={() => setPage(p => Math.max(1, p - 1))}\n            disabled={page === 1}\n            className="gap-1.5"\n          >\n            <ChevronLeft className="h-4 w-4" /> Sebelumnya\n          </Button>\n          <div className="text-sm font-medium text-muted-foreground">\n            Halaman {page} dari {totalPages}\n          </div>\n          <Button\n            variant="outline"\n            size="sm"\n            onClick={() => setPage(p => Math.min(totalPages, p + 1))}\n            disabled={page === totalPages}\n            className="gap-1.5"\n          >\n            Selanjutnya <ChevronRight className="h-4 w-4" />\n          </Button>\n        </div>\n      )}\n    </div>`
);


// EmployeeView updates
content = content.replace(
  `function EmployeeView({ userId, leaveRequests, leaveQuota, weeklyOffDays, holidays }: {`,
  `function EmployeeView({ userId, leaveRequests, leaveQuota, weeklyOffDays, holidays }: {`
);

content = content.replace(
  `  const [isUploading, setIsUploading] = useState(false)`,
  `  const [isUploading, setIsUploading] = useState(false)\n  const [search, setSearch] = useState("")\n  const [page, setPage] = useState(1)\n  const ITEMS_PER_PAGE = 15`
);

content = content.replace(
  `  const filtered = tab === "all" ? leaveRequests : leaveRequests.filter((r) => r.status === tab)`,
  `  let filtered = tab === "all" ? leaveRequests : leaveRequests.filter((r) => r.status === tab)\n  if (search) {\n    const s = search.toLowerCase()\n    filtered = filtered.filter(r => r.reason?.toLowerCase().includes(s) || LEAVE_TYPE_CONFIG[r.type]?.label.toLowerCase().includes(s))\n  }\n  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)\n  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)`
);

content = content.replace(
  `      {/* Filter tabs + Submit button */}`,
  `      <div className="relative">\n        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />\n        <Input\n          placeholder="Cari tipe atau alasan..."\n          value={search}\n          onChange={(e) => { setSearch(e.target.value); setPage(1) }}\n          className="pl-9 bg-background"\n        />\n      </div>\n\n      {/* Filter tabs + Submit button */}`
);

content = content.replace(
  `                onClick={() => setTab(s)}`,
  `                onClick={() => { setTab(s); setPage(1); }}`
);

content = content.replace(
  `          {filtered.map((r) => {`,
  `          {paginated.map((r) => {`
);

content = content.replace(
  `        </div>\n      )}\n    </div>\n  )\n}`,
  `        </div>\n      )}\n      {totalPages > 1 && (\n        <div className="flex items-center justify-between mt-6 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">\n          <Button\n            variant="outline"\n            size="sm"\n            onClick={() => setPage(p => Math.max(1, p - 1))}\n            disabled={page === 1}\n            className="gap-1.5"\n          >\n            <ChevronLeft className="h-4 w-4" /> Sebelumnya\n          </Button>\n          <div className="text-sm font-medium text-muted-foreground">\n            Halaman {page} dari {totalPages}\n          </div>\n          <Button\n            variant="outline"\n            size="sm"\n            onClick={() => setPage(p => Math.min(totalPages, p + 1))}\n            disabled={page === totalPages}\n            className="gap-1.5"\n          >\n            Selanjutnya <ChevronRight className="h-4 w-4" />\n          </Button>\n        </div>\n      )}\n    </div>\n  )\n}`
);


// Avatar update for HRD View
content = content.replace(
  `{/* Employee Avatar */}\n                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">\n                      {initials}\n                    </div>`,
  `{/* Employee Avatar */}\n                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground overflow-hidden">\n                      {r.user.avatarUrl ? <img src={r.user.avatarUrl} alt={r.user.name} className="h-full w-full object-cover" /> : initials}\n                    </div>`
);

fs.writeFileSync('components/hris/pages/leave.tsx', content);
console.log("Patched successfully");
