import { config } from 'dotenv'; config({ path: '.env' }); const { generateAllPayrollSlips, generatePayrollSlip } = require('./app/actions/payroll'); 
async function test() {
  console.log('Testing generateAllPayrollSlips...');
  const res = await generateAllPayrollSlips(2026, 7);
  console.log('Result:', res);
  if (res.success === false || res.message?.includes('Gagal')) {
    console.log('Trying one explicitly to catch error...');
    try {
       const pr = await generatePayrollSlip('usr_dummy_0', 2026, 7);
       console.log('Single result:', pr);
    } catch(e) {
       console.error('Error generating single:', e);
    }
  }
}
test();

