import { useState, useEffect } from "react";

export function useIPAddress() {
  const [ip, setIp] = useState("");
  const [locationInfo, setLocationInfo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((data) => {
        setIp(data.ip);
        return fetch(`https://ipapi.co/${data.ip}/json/`);
      })
      .then((r) => r.json())
      .then((data) => {
        setLocationInfo(`${data.city || ""}, ${data.region || ""}, ${data.country_name || ""}`);
      })
      .catch(() => setIp("Unknown"))
      .finally(() => setLoading(false));
  }, []);

  return { ip, locationInfo, loading };
}
