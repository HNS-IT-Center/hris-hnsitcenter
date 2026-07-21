const fs = require('fs');
let content = fs.readFileSync('app/actions/payroll.ts', 'utf-8');

content = content.replace(
  `  for (const ot of overtimeRequests) {\n    if (ot.totalHours) lemburHours += ot.totalHours\n  }\n  const lembur = Math.round(lemburHours * hourlyRate)`,
  `  for (const ot of overtimeRequests) {\n    if (!ot.totalHours) continue\n    let actualHours = ot.totalHours\n    const att = attendanceMap.get(ot.overtimeDate.toISOString().slice(0, 10))\n    if (att?.checkOut && ot.endTime) {\n      const expectedEnd = new Date(ot.endTime).getTime()\n      const actualEnd = new Date(att.checkOut).getTime()\n      const missedMs = expectedEnd - actualEnd\n      // If check-out is more than 15 minutes (900000 ms) early\n      if (missedMs > 900000) {\n        const missedHours = Math.ceil(missedMs / (1000 * 60 * 60))\n        actualHours = Math.max(0, actualHours - missedHours)\n      }\n    }\n    lemburHours += actualHours\n  }\n  const lembur = Math.round(lemburHours * 20000)`
);

fs.writeFileSync('app/actions/payroll.ts', content);
console.log("Payroll OT logic patched");
