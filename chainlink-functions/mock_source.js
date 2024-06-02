const apiResponse = await Functions.makeHttpRequest({
  url: `https://api.weatherxm.com/api/v1/me/devices?ids=${args[0]}`,
  headers: {
  'Authorization': `Bearer ${secrets.bearer}`
  }
});
if (apiResponse.status !== 200) {
  throw new Error(`Request failed with status code ${apiResponse}`);
}

const tempData = [
  {
    "id": 0,
    "name": "string",
    "profile": "string",
    "label": "string",
    "relation": "owned",
    "address": "string",
    "timezone": "string",
    "bat_state": "ok",
    "location": {
      "lat": 37.7749,
      "lon": -122.4194
    },
    "attributes": {
      "isActive": true,
      "lastWeatherStationActivity": "2024-06-01T13:01:44.033Z",
      "claimedAt": "2024-06-01T13:01:44.033Z",
      "firmware": {
        "current": "1.0.2",
        "assigned": "1.1.0"
      },
      "hex3": {
        "index": "871ed1952ffffff",
        "polygon": [
          {
            "lat": 37.7749,
            "lon": -122.4194
          }
        ],
        "center": {
          "lat": 37.7749,
          "lon": -122.4194
        }
      },
      "hex7": {
        "index": "871ed1952ffffff",
        "polygon": [
          {
            "lat": 37.7749,
            "lon": -122.4194
          }
        ],
        "center": {
          "lat": 37.7749,
          "lon": -122.4194
        }
      }
    },
    "current_weather": {
      "timestamp": "2022-03-04T00:00:00+02:00",
      "temperature": 12.10000038,
      "humidity": 34,
      "precipitation": 0,
      "wind_speed": 2.962400198,
      "wind_gust": 3.569999933,
      "wind_direction": 192,
      "pressure": 1025.47937,
      "uv_index": 0,
      "feels_like": 12.10000038,
      "icon": "partly-cloudy-day",
      "precipitation_accumulated": 14.10000022,
      "dew_point": 8.23010032,
      "solar_irradiance": 30.10655737704918
    },
    "rewards": {
      "total_rewards": 0,
      "actual_reward": 0
    }
  },
]

if (tempData.length > 0) {
  if (tempData[0].relation === "owned") {
    console.log("here")
    if (pointInPolygon({lat: parseFloat(args[1]), lon: parseFloat(args[2])}, generatePolygon(tempData[0].location, 1500, 6))) {
      console.log("here")
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
  console.log(coords)
  return coords;
}

function pointInPolygon(point, polygon) {
  console.log(point)
  let x = point.lon, y = point.lat;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      let xi = polygon[i].lon, yi = polygon[i].lat;
      let xj = polygon[j].lon, yj = polygon[j].lat;

      let intersect = ((yi > y) != (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }
  console.log(inside)
  return inside;
}


return Functions.encodeString("false");


