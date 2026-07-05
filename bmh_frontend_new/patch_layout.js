const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/_layout.tsx';
let c = fs.readFileSync(file, 'utf8');

const targetStr = `
if (Platform.OS !== 'web') {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
      AsyncStorage.setItem(key, value).catch(err => console.error('localStorage setItem error:', err));
    },
    removeItem: (key: string) => {
      store.delete(key);
      AsyncStorage.removeItem(key).catch(err => console.error('localStorage removeItem error:', err));
    },
    clear: () => {
      store.clear();
      AsyncStorage.clear().catch(err => console.error('localStorage clear error:', err));
    },
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() { return store.size; },
    __setRaw: (key: string, value: string) => store.set(key, value)
  };
  (global as any).localStorage = localStorageMock;
}
`;

c = c.replace(/if \(Platform\.OS !== 'web'\) \{\s*const store = new Map<string, string>\(\);\s*const localStorageMock = \{[\s\S]*?\(global as any\)\.localStorage = localStorageMock;\s*\}/, targetStr.trim());

const initReplace = `
              const store = (global as any).localStorage;
              if (store && typeof store.__setRaw === 'function') {
                store.__setRaw(key, value);
              } else if (store && typeof store.setItem === 'function') {
                store.setItem(key, value);
              }
`;

c = c.replace(/const store = \(global as any\)\.localStorage;\s*if \(store && typeof store\.setItem === 'function'\) \{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*store\.setItem\(key, value\);\s*\}/, initReplace.trim());

fs.writeFileSync(file, c);
console.log('Fixed _layout.tsx hydration');
