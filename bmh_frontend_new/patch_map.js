const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/admin/dashboard/delivery-fleet.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "  Popup = RL.Popup;",
  "  Popup = RL.Popup;\n  var useMap = RL.useMap;"
);

const fitterCode = `
function MapBoundsFitter({ fleet }: { fleet: any[] }) {
  const map = useMap();
  useEffect(() => {
    const validMarkers = fleet.filter(b => b.location_lat && b.location_lng);
    if (validMarkers.length > 0) {
      const bounds = L.latLngBounds(validMarkers.map(m => [parseFloat(m.location_lat), parseFloat(m.location_lng)]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [fleet, map]);
  return null;
}
`;

c = c.replace(
  "export default function DeliveryFleetScreen() {",
  fitterCode + "\nexport default function DeliveryFleetScreen() {"
);

c = c.replace(
  "                    />\n                    {fleet.map",
  "                    />\n                    <MapBoundsFitter fleet={fleet} />\n                    {fleet.map"
);

fs.writeFileSync(file, c);
console.log('MapBoundsFitter added');
