import re

def update_employee_profile(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add states for departments and roles if not present
    if 'const [departments, setDepartments] = useState<any[]>([]);' not in content:
        state_injection = """  const [requestingUpdate, setRequestingUpdate] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);"""
        content = content.replace("  const [requestingUpdate, setRequestingUpdate] = useState(false);", state_injection)
    
    # Add API fetch in loadUser if not present
    if 'setDepartments(deptRes.data.data)' not in content:
        api_fetch = """        }
        
        try {
          const [deptRes, roleRes] = await Promise.all([
            axios.get('https://napi.bharatmedicalhallplus.com/department'),
            axios.get('https://napi.bharatmedicalhallplus.com/roles')
          ]);
          if (deptRes.data.success) setDepartments(deptRes.data.data);
          if (roleRes.data.success) setRoles(roleRes.data.data);
        } catch (err) {
          console.log('Error fetching metadata', err);
        }
      };
      loadUser();"""
        # We need to replace exactly the end of loadUser function in useEffect
        content = content.replace("        }\n      };\n      loadUser();", api_fetch)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def update_subadmin_profile(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add states for departments if not present
    if 'const [departments, setDepartments] = useState<any[]>([]);' not in content:
        state_injection = """  const [requestingUpdate, setRequestingUpdate] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);"""
        content = content.replace("  const [requestingUpdate, setRequestingUpdate] = useState(false);", state_injection)
    
    # Add API fetch in loadUser if not present
    if 'setDepartments(deptRes.data.data)' not in content:
        api_fetch = """        }
        
        try {
          const deptRes = await axios.get('https://napi.bharatmedicalhallplus.com/department');
          if (deptRes.data.success) setDepartments(deptRes.data.data);
        } catch (err) {
          console.log('Error fetching departments', err);
        }
      };
      loadUser();"""
        # Note: in subadmin profile, loadUser is called inside useEffect or not? 
        # Let's just do a string replacement
        content = content.replace("        }\n      };\n      loadUser();", api_fetch)
        
        # If the above replacement failed, try replacing just `};\n      loadUser();`
        if 'setDepartments(deptRes.data.data)' not in content:
             api_fetch_alt = """        
        try {
          const deptRes = await axios.get('https://napi.bharatmedicalhallplus.com/department');
          if (deptRes.data.success) setDepartments(deptRes.data.data);
        } catch (err) {
          console.log('Error fetching departments', err);
        }
      };
      loadUser();"""
             content = content.replace("      };\n      loadUser();", api_fetch_alt)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

update_employee_profile(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\profile.tsx')
update_subadmin_profile(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\profile.tsx')
