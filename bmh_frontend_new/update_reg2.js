const fs = require('fs');
let c = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/register.tsx', 'utf8');

// 1. Remove Roles state and fetch
c = c.replace(/const \[roles, setRoles\] = useState<[^>]+>\(\[\]\);\n/, '');
c = c.replace(/axios\.get\('https:\/\/bmh-eitu\.onrender\.com\/roles'\)/, '');
c = c.replace(/const \[deptRes, roleRes\] = await Promise\.all\(\[\s+axios\.get\('https:\/\/bmh-eitu\.onrender\.com\/department'\),\s+\]\);/, "const deptRes = await axios.get('https://bmh-eitu.onrender.com/department');");
c = c.replace(/if \(roleRes\.data\.success\) setRoles\(roleRes\.data\.data\);/, '');

// Fix the Promise.all empty array logic
c = c.replace(/const \[deptRes, roleRes\] = await Promise\.all\(\[\s*axios\.get\('https:\/\/bmh-eitu\.onrender\.com\/department'\),\s*\]\);/, "const deptRes = await axios.get('https://bmh-eitu.onrender.com/department');");

// Oh, the Promise.all had two elements, I replaced the second with empty string above. Let's just do a string replacement for the fetch function.
c = c.replace(/const fetchData = async \(\) => \{[\s\S]*?fetchData\(\);\n  \}, \[\]\);/m, `React.useEffect(() => {
    const fetchData = async () => {
      try {
        const deptRes = await axios.get('https://bmh-eitu.onrender.com/department');
        if (deptRes.data.success) setDepartments(deptRes.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);`);

// 2. Remove availableRoles and selectedRole state
c = c.replace(/const availableRoles = [^\n]+\n/, '');
c = c.replace(/const \[selectedRole, setSelectedRole\] = useState\(''\);\n/, '');

// 3. Remove Role dropdown from UI
const roleSectionRegex = /\{\/\* 4\. Role Assignment \*\/\}.*?<\/View>\s*<\/View>/s;
c = c.replace(roleSectionRegex, '');

// 4. Update setSelectedDept to not reset role
c = c.replace(/setSelectedDept\(String\(dept\.id\)\); setSelectedRole\(''\);/g, "setSelectedDept(String(dept.id));");

// 5. Rewrite handleRegister
const handleRegisterReplacement = `const handleRegister = async () => {
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

c = c.replace(/const handleRegister = async \(\) => \{[\s\S]*?setRegistering\(false\);\n    \}\n  \};/m, handleRegisterReplacement);

// Remove the `!selectedRole` validation in handleRegister if it was missed
c = c.replace(/\|\| !selectedRole /g, '');

fs.writeFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/register.tsx', c);
