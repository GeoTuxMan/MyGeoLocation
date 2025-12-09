import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import MapView, { Marker, UrlTile, Region, Camera } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Coordinates for Constanta, Romania
const CONSTANTA_COORDINATES = {
  latitude: 44.159801,
  longitude: 28.634800,
};

const CONSTANTA_REGION = {
  latitude: CONSTANTA_COORDINATES.latitude,
  longitude: CONSTANTA_COORDINATES.longitude,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Tile server for OpenStreetMap
const OSM_TILE_URL = 'https://tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region>(CONSTANTA_REGION);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [showDetails, setShowDetails] = useState(false);
  
  const mapRef = useRef<MapView>(null);

  // Request permission on app load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setErrorMsg('Location permission was denied!');
          setPermissionGranted(false);
        } else {
          setPermissionGranted(true);
          setErrorMsg(null);
        }
      } catch (error) {
        setErrorMsg('Error getting permission!');
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getCurrentPosition = async () => {
    if (!permissionGranted) {
      Alert.alert(
        'Permission Required',
        'The app needs location permission!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
        ]
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      
      setLocation(currentLocation);
      
      // Animate to current location
      const newRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setRegion(newRegion);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
      
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Could not get current location. Make sure GPS is enabled!');
    } finally {
      setLoading(false);
    }
  };

  const zoomIn = () => {
    if (mapRef.current) {
      mapRef.current.getCamera().then(camera => {
        const newCamera: Camera = {
          ...camera,
          zoom: (camera.zoom || 10) + 1, // Use 10 as default if zoom is undefined
        };
        mapRef.current?.animateCamera(newCamera, { duration: 300 });
      }).catch(error => {
        console.error('Zoom in error:', error);
      });
    }
  };

  const zoomOut = () => {
    if (mapRef.current) {
      mapRef.current.getCamera().then(camera => {
        const newZoom = (camera.zoom || 10) - 1;
        const newCamera: Camera = {
          ...camera,
          zoom: newZoom > 0 ? newZoom : 1, // Prevent negative zoom
        };
        mapRef.current?.animateCamera(newCamera, { duration: 300 });
      }).catch(error => {
        console.error('Zoom out error:', error);
      });
    }
  };

  const showLocationDetails = () => {
    if (!location) return;
    
    const { latitude, longitude, altitude, accuracy, speed, heading } = location.coords;
    
    Alert.alert(
      '📍 Location Details',
      `**Coordinates:**\n` +
      `Latitude: ${latitude.toFixed(6)}\n` +
      `Longitude: ${longitude.toFixed(6)}\n\n` +
      `**Information:**\n` +
      (altitude ? `Altitude: ${altitude.toFixed(2)} m\n` : '') +
      `Accuracy: ±${accuracy?.toFixed(2) || 'N/A'} m\n` +
      (speed ? `Speed: ${(speed * 3.6).toFixed(2)} km/h\n` : '') +
      (heading ? `Direction: ${heading.toFixed(0)}°` : ''),
      [{ text: 'OK', style: 'default' }]
    );
  };

  const resetToConstanta = () => {
    setRegion(CONSTANTA_REGION);
    setLocation(null);
    setShowDetails(false);
    
    if (mapRef.current) {
      mapRef.current.animateToRegion(CONSTANTA_REGION, 1000);
    }
  };

  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  const centerOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🌍 MyGeoLocation</Text>
        <Text style={styles.subtitle}>OpenStreetMap - Constanta, Romania</Text>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          showsUserLocation={!!location}
          showsMyLocationButton={false}
          showsCompass={true}
          zoomEnabled={true}
          scrollEnabled={true}
          rotateEnabled={true}
          mapType={mapType}
          customMapStyle={mapType === 'standard' ? [] : undefined}
        >
          {/* OpenStreetMap Tiles */}
          <UrlTile
            urlTemplate={OSM_TILE_URL}
            maximumZ={19}
            flipY={false}
          />
          
          {/* Marker for Constanta */}
          <Marker
            coordinate={CONSTANTA_COORDINATES}
            title="Constanta"
            description="Constanta City, Romania"
            pinColor="#2196F3"
          >
            <MaterialIcons name="location-city" size={30} color="#2196F3" />
          </Marker>
          
          {/* Marker for current location (if exists) */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="Your Location"
              description="Your current position"
              pinColor="#FF5252"
              onPress={() => setShowDetails(true)}
            >
              <View style={styles.userMarker}>
                <MaterialIcons name="person-pin-circle" size={40} color="#FF5252" />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton} onPress={zoomIn}>
            <MaterialIcons name="add" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton} onPress={zoomOut}>
            <MaterialIcons name="remove" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mapControlButton, !location && styles.mapControlButtonDisabled]} 
            onPress={centerOnUser} 
            disabled={!location}
          >
            <MaterialIcons name="my-location" size={24} color={location ? "#333" : "#999"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton} onPress={toggleMapType}>
            <MaterialIcons name={mapType === 'standard' ? 'satellite' : 'map'} size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Button */}
      <View style={styles.mainButtonContainer}>
        <TouchableOpacity 
          style={[styles.mainButton, loading && styles.mainButtonDisabled]} 
          onPress={getCurrentPosition}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialIcons name="gps-fixed" size={24} color="white" />
              <Text style={styles.mainButtonText}>Get My Current Position</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Secondary Buttons */}
      {location && (
        <View style={styles.secondaryButtons}>
          <TouchableOpacity style={styles.secondaryButton} onPress={showLocationDetails}>
            <MaterialIcons name="info" size={20} color="white" />
            <Text style={styles.secondaryButtonText}>Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.secondaryButton, styles.resetButton]} onPress={resetToConstanta}>
            <MaterialIcons name="restore" size={20} color="white" />
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Location Information (if displayed) */}
      {showDetails && location && (
        <View style={styles.detailsPanel}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setShowDetails(false)}
          >
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          
          <Text style={styles.detailsTitle}>📍 Your Location</Text>
          <View style={styles.detailsRow}>
            <MaterialIcons name="place" size={16} color="#666" />
            <Text style={styles.detailsText}>
              Lat: {location.coords.latitude.toFixed(6)}
            </Text>
          </View>
          <View style={styles.detailsRow}>
            <MaterialIcons name="place" size={16} color="#666" />
            <Text style={styles.detailsText}>
              Long: {location.coords.longitude.toFixed(6)}
            </Text>
          </View>
          {location.coords.altitude && (
            <View style={styles.detailsRow}>
              <MaterialIcons name="terrain" size={16} color="#666" />
              <Text style={styles.detailsText}>
                Altitude: {location.coords.altitude.toFixed(2)} m
              </Text>
            </View>
          )}
          <View style={styles.detailsRow}>
            <MaterialIcons name="schedule" size={16} color="#666" />
            <Text style={styles.detailsText}>
              Time: {new Date(location.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Using OpenStreetMap • Made with ❤️ in Romania
        </Text>
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}

      {/* Error message */}
      {errorMsg && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={20} color="#c62828" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#2196F3',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 5,
  },
  mapContainer: {
    flex: 1,
    margin: 15,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 5,
    elevation: 3,
  },
  mapControlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  mapControlButtonDisabled: {
    opacity: 0.5,
  },
  userMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  mainButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mainButtonDisabled: {
    backgroundColor: '#90caf9',
  },
  mainButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  secondaryButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 0.48,
    elevation: 3,
  },
  resetButton: {
    backgroundColor: '#FF9800',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  detailsPanel: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    padding: 10,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
    marginLeft: 10,
    fontSize: 14,
  },
});