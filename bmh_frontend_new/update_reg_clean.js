const fs = require('fs');
let c = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/register.tsx', 'utf8');

// Replacements
c = c.replace(/EmployeeRegisterScreen/g, 'SubAdminRegisterScreen');
c = c.replace(/Employee Register/g, 'Sub Admin Register');
c = c.replace(/'\/employee\/login'/g, "'/department/login'");
c = c.replace(/https:\/\/bmh-eitu.onrender.com\/employees/g, 'https://bmh-eitu.onrender.com/admin/department-admins');

// Remove Role dropdown
const roleRegex = /\{\s*selectedDept \? \([\s\S]*?\) : null\}/;
c = c.replace(roleRegex, '');

// Clean handleRegister
const handleReg = `const handleRegister = async () => {
    if (!fullName || !email || !selectedDept || !password) {
      Alert.alert('Error', 'Please fill in required fields and select a department.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setRegistering(true);
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/admin/department-admins', {
        full_name: fullName,
        email,
        password,
        department_id: selectedDept,
        mobile,
        image: photo,
        schedule_in: shiftIn || '09:00',
        schedule_out: shiftOut || '17:00',
        break_in: breakStart || '13:00',
        break_out: breakEnd || '14:00',
        weekly_off_days: 'Sunday',
        bank_account: accountNo,
        blood_group: bloodGroup,
        address: permAddr1,
        profile_data: {
          emergencyContact, age, aadhaar, pan, esi, manager, salary, empType, jobDesc, tempAddr1, tempCity, tempState, permCity, permState, ifsc, bankName, branch,
          joiningDate: new Date().toISOString().split('T')[0]
        }
      });
      if (res.data.success) {
        Alert.alert('Success', 'Registered successfully!');
        router.replace('/department/login' as any);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };`;
c = c.replace(/const handleRegister = async \(\) => \{[\s\S]*?setRegistering\(false\);\n    \}\n  \};/, handleReg);

fs.writeFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/register.tsx', c);
