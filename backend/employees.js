// Employee registry - extracted from Azka_Firmware_Team_KPI_Table.xlsx
// Used for credential validation and email personalization

export const EMPLOYEES = [
  { hrCode: '1220144', name: 'Omar Mahmoud Abdelhady', email: 'omar.mahmoud@azka.com.eg', department: 'DLMS', experience: 7 },
  { hrCode: '1230077', name: 'Mohamed Elsayed Mohamed', email: 'mohamed.hamed@azka.com.eg', department: 'DLMS', experience: 3 },
  { hrCode: '1230087', name: 'Hesham Galal Mostafa', email: 'hesham.galal@azka.com.eg', department: 'DLMS', experience: 5 },
  { hrCode: '1220035', name: 'Abdelrahman Moussa', email: 'abdelrahman.moussa@azka.com.eg', department: 'DLMS', experience: 4 },
  { hrCode: '1230051', name: 'Ahmed M. ElHamamsy', email: 'ahmed.hamamsy@azka.com.eg', department: 'DLMS', experience: 5 },
  { hrCode: '1230078', name: 'Saeed Alaa Elfayoumy', email: 'saeed.elfayoumy@azka.com.eg', department: 'DLMS', experience: 5 },
  { hrCode: '1230036', name: 'Ahmed Hassan Zakaria', email: 'ahmed.hassan@azka.com.eg', department: 'DLMS', experience: 4 },
  { hrCode: '1230012', name: 'Nourhan M. Alrefaei', email: 'nourhan.refaie@azka.com.eg', department: 'DLMS', experience: null },
  { hrCode: '1220134', name: 'Mervat Abdelrahman', email: 'mervat.abdelrahman@azka.com.eg', department: 'Flow', experience: null },
  { hrCode: '1230035', name: 'Ali Mahmoud Morsy', email: 'ali.morsy@azka.com.eg', department: 'Flow', experience: 5 },
  { hrCode: '1230076', name: 'Hossam Abdullah Mekhamer', email: 'hossam.abdullah@azka.com.eg', department: 'Flow', experience: 3 },
  { hrCode: '1220067', name: 'Mohamed Salah Taman', email: 'mohamed.taman@azka.com.eg', department: 'Flow', experience: 7 },
  { hrCode: '5240043', name: 'Mohamed Ashraf Merdan', email: 'mohamed.merdan@azka.com.eg', department: 'Flow', experience: 5 },
  { hrCode: '1230061', name: 'Mohamed Sayed Shahin', email: 'mohamed.shaheen@azka.com.eg', department: 'Flow', experience: 4 },
  { hrCode: '1230081', name: 'Nahla Hussien Rizk', email: 'nahla.hussin@azka.com.eg', department: 'Flow', experience: 5 },
  { hrCode: '1190200', name: 'Ahmed ElSayed Abd Elkader', email: 'ahmed.elsayed@azka.com.eg', department: 'Flow', experience: 6 },
  { hrCode: '1220108', name: 'Muaaz Rashad Sewilam', email: 'muaaz.rashad@azka.com.eg', department: 'Flow', experience: 5 },
  { hrCode: '1220247', name: 'Samar M. Abdolmonem', email: 'samar.mohamed@azka.com.eg', department: 'Flow', experience: 3 },
  { hrCode: '1240005', name: 'Mostafa Abdelwahab', email: 'moustafa.abdelwahab@azka.com.eg', department: 'Flow', experience: 2 },
  { hrCode: '5240058', name: 'Ahmed Lotfy Mohamed', email: 'ahmed.lotfy@azka.com.eg', department: 'Flow', experience: 8 },
  { hrCode: '1230058', name: 'Ahmed Gaber Mohammed', email: 'ahmed.gaber@azka.com.eg', department: 'Prepaid', experience: null },
  { hrCode: '1220243', name: 'Ahmed Adel Elhossiny', email: 'ahmed.elhossiny@azka.com.eg', department: 'Prepaid', experience: 5 },
  { hrCode: '1230038', name: 'Ahmed Mustafa Abdelnaby', email: 'ahmed.abdelnaby@azka.com.eg', department: 'Prepaid', experience: 5 },
  { hrCode: '1230053', name: 'Nour Eldean Ashraf', email: 'nour.ashraf@azka.com.eg', department: 'Prepaid', experience: 4 },
  { hrCode: '1220112', name: 'Muhammad Hassan Hafez', email: 'hassan.hafez@azka.com.eg', department: 'Prepaid', experience: 5 },
  { hrCode: '1230083', name: 'Ahmed A. Elzoughby', email: 'ahmed.abdeltawab@azka.com.eg', department: 'R&D', experience: 7 },
  { hrCode: '1230151', name: 'Mohamed Medhat Ghareeb', email: 'mohamed.medhat@azka.com.eg', department: 'R&D', experience: 5 },
  { hrCode: '1220106', name: 'Mahmoud M. Youness', email: 'mahmoud.youness@azka.com.eg', department: 'R&D', experience: null },
  { hrCode: '1220291', name: 'Sief Eldin Gamal Yones', email: 'saif.eldin@azka.com.eg', department: 'R&D', experience: 9 },
  { hrCode: '1230025', name: 'Mohamed Magdy Hamed', email: 'mohamed.magdy@azka.com.eg', department: 'R&D', experience: null },
  { hrCode: '1230068', name: 'Abdelrahman Kadah', email: 'abdelrahman.kadah@azka.com.eg', department: 'R&D', experience: 3 },
  { hrCode: '5240029', name: 'Momen Ahmed Fathy', email: 'moemen.ahmed@azka.com.eg', department: 'R&D', experience: 1 },
];

/**
 * Find employee by email + hrCode pair (both must match)
 */
export function findEmployee(email, hrCode) {
  return EMPLOYEES.find(
    (e) => e.email.toLowerCase() === email.toLowerCase() && e.hrCode === hrCode
  ) || null;
}

/**
 * Find employee by email only
 */
export function findEmployeeByEmail(email) {
  return EMPLOYEES.find(
    (e) => e.email.toLowerCase() === email.toLowerCase()
  ) || null;
}
