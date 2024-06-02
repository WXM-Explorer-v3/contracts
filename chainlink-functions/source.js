const apiResponse = await Functions.makeHttpRequest({
    url: `https://api.weatherxm.com/api/v1/me/devices?ids=${args[0]}`,
    headers: {
    'Authorization': `Bearer ${secrets.bearer}`
    }
  });
  if (apiResponse.status !== 200) {
    throw new Error(`Request failed with status code ${apiResponse}`);
  }
  if (apiResponse.data.length > 0) {
    if (apiResponse.data[0].relation === "owned") {
      if (pointInPolygon({lat: parseFloat(args[1]), lon: parseFloat(args[2])}, generatePolygon(apiResponse.data[0].location, 1500, 6))) {
        const walletData = await Functions.makeHttpRequest({
          url: `https://api.weatherxm.com/api/v1/me/wallet`,
          headers: {
          'Authorization': `Bearer ${secrets.bearer}`
          }
        });
        if (walletData.status !== 200) {
          throw new Error(`Request failed with status code ${walletData}`);
        }
        
        if (walletData.data.address === args[3]) {
          return Functions.encodeString("true");
        }
      }
    }
  }
  function generatePolygon(center, radius, numSides) {
    const coords = [];
    const angleStep = (2 * Math.PI) / numSides;
  
    for (let i = 0; i < numSides; i++) {
        const angle = i * angleStep;
        const dx = radius * Math.cos(angle);
        const dy = radius * Math.sin(angle);
  
        const lat = parseFloat(center.lat) + (dy / 111000);
        const lon = parseFloat(center.lon) + (dx / (111000 * Math.cos(parseFloat(center.lat) * Math.PI / 180)));
  
        coords.push({ lat, lon });
    }
  
    coords.push(coords[0]);
    return coords;
  }
  
  function pointInPolygon(point, polygon) {
    let x = point.lon, y = point.lat;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i].lon, yi = polygon[i].lat;
        let xj = polygon[j].lon, yj = polygon[j].lat;
  
        let intersect = ((yi > y) != (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
  }
  
  
  return Functions.encodeString("false");
  
  
  