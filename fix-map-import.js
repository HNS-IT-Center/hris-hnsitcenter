const fs = require('fs');

let content = fs.readFileSync('components/hris/pages/hrd-attendance-logs.tsx', 'utf-8');

// Remove duplicate Map and Table import
content = content.replace(`import { Map, Table } from "lucide-react"\n`, '');

// Add Table to the large import block
content = content.replace(`  Filter\n} from "lucide-react"`, `  Filter,\n  Table\n} from "lucide-react"`);

fs.writeFileSync('components/hris/pages/hrd-attendance-logs.tsx', content);
console.log("Fixed duplicate Map import");
