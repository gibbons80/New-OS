import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { GoogleMap, LoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Loader2, AlertCircle, User, Building2, Map as MapIcon, Satellite, Star, Mail, Phone } from 'lucide-react';
import AddressAutocomplete from '@/components/cs/AddressAutocomplete';

const geocodeAddress = async (address, apiKey) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
  }
  return null;
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function CSMap() {
  // Restore from localStorage or use defaults
  const [searchAddress, setSearchAddress] = useState(() => {
    return localStorage.getItem('csmap_searchAddress') || '';
  });
  const [selectedServices, setSelectedServices] = useState(() => {
    const stored = localStorage.getItem('csmap_selectedServices');
    return stored ? JSON.parse(stored) : [];
  });
  const [photographerType, setPhotographerType] = useState(() => {
    return localStorage.getItem('csmap_photographerType') || 'all';
  });
  const [searchCoordinates, setSearchCoordinates] = useState(() => {
    const stored = localStorage.getItem('csmap_searchCoordinates');
    return stored ? JSON.parse(stored) : null;
  });
  const [mapCenter, setMapCenter] = useState(() => {
    const stored = localStorage.getItem('csmap_mapCenter');
    return stored ? JSON.parse(stored) : { lat: 39.8283, lng: -98.5795 };
  });
  const [mapZoom, setMapZoom] = useState(() => {
    const stored = localStorage.getItem('csmap_mapZoom');
    return stored ? parseInt(stored) : 4;
  });
  const [selectedPhotographer, setSelectedPhotographer] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [tileLayer, setTileLayer] = useState('map');
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [apiKeyFailed, setApiKeyFailed] = useState(false);
  const [fetchingApiKey, setFetchingApiKey] = useState(true);
  const [staffStatusFilter, setStaffStatusFilter] = useState(() => {
    return localStorage.getItem('csmap_staffStatusFilter') || 'active';
  });

  // Fetch API key from backend
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await base44.functions.invoke('getGoogleMapsKey');
        if (response.data.apiKey) {
          setApiKey(response.data.apiKey);
        }
      } catch (error) {
        console.error('Failed to fetch API key:', error);
        // Retry once after 2 seconds
        setTimeout(async () => {
          try {
            const retryResponse = await base44.functions.invoke('getGoogleMapsKey');
            if (retryResponse.data.apiKey) {
              setApiKey(retryResponse.data.apiKey);
            } else {
              setApiKeyFailed(true);
            }
          } catch (retryError) {
            console.error('API key retry failed:', retryError);
            setApiKeyFailed(true);
          } finally {
            setFetchingApiKey(false);
          }
        }, 2000);
      } finally {
        setFetchingApiKey(false);
      }
    };
    fetchApiKey();
  }, []);

  // Persist search state to localStorage
  useEffect(() => {
    localStorage.setItem('csmap_searchAddress', searchAddress);
  }, [searchAddress]);

  useEffect(() => {
    localStorage.setItem('csmap_selectedServices', JSON.stringify(selectedServices));
  }, [selectedServices]);

  useEffect(() => {
    localStorage.setItem('csmap_photographerType', photographerType);
  }, [photographerType]);

  useEffect(() => {
    localStorage.setItem('csmap_staffStatusFilter', staffStatusFilter);
  }, [staffStatusFilter]);

  useEffect(() => {
    localStorage.setItem('csmap_searchCoordinates', JSON.stringify(searchCoordinates));
  }, [searchCoordinates]);

  useEffect(() => {
    localStorage.setItem('csmap_mapCenter', JSON.stringify(mapCenter));
  }, [mapCenter]);

  useEffect(() => {
    localStorage.setItem('csmap_mapZoom', mapZoom.toString());
  }, [mapZoom]);

  // Fetch staff photographers (filtered by department "Photographer")
  const { data: staffList = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-for-map'],
    queryFn: async () => {
      const staff = await base44.entities.Staff.filter({
        department: 'Photographer',
        employment_status: { $ne: 'terminated' }
      });
      // Filter to only those with addresses and coordinates
      return staff.filter(s => s.address && s.photographer_status !== 'need_to_be_removed');
    },
  });

  // Fetch third-party photographers
  const { data: thirdPartyList = [], isLoading: thirdPartyLoading } = useQuery({
    queryKey: ['third-party-photographers-map'],
    queryFn: async () => {
      const thirdParty = await base44.entities.ThirdPartyPhotographer.list();
      return thirdParty.filter(tp => tp.is_active);
    },
  });

  // Fetch service groups from CS settings
  const { data: serviceGroups = [] } = useQuery({
    queryKey: ['cs-service-groups'],
    queryFn: async () => {
      const groups = await base44.entities.CSServiceGroup.list();
      return groups.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
  });

  // Subscribe to real-time updates on staff and third-party photographers
  const queryClient = useQueryClient();
  useEffect(() => {
    const unsubscribeStaff = base44.entities.Staff.subscribe((event) => {
      if (event.type === 'update') {
        // Refetch immediately when a staff update occurs
        queryClient.invalidateQueries({ queryKey: ['staff-for-map'] });
      }
    });

    const unsubscribeThirdParty = base44.entities.ThirdPartyPhotographer.subscribe((event) => {
      if (event.type === 'update') {
        // Refetch immediately when a third-party update occurs
        queryClient.invalidateQueries({ queryKey: ['third-party-photographers-map'] });
      }
    });

    return () => {
      unsubscribeStaff();
      unsubscribeThirdParty();
    };
  }, [queryClient]);

  // Process and combine photographers with coordinates
  const [photographers, setPhotographers] = useState([]);

  useEffect(() => {
    const processPhotographers = async () => {
      const result = [];

      // Process staff photographers - only include those with coordinates
      let staffWithCoords = 0;
      let staffWithoutCoords = 0;
      for (const staff of staffList) {
        let coords = null;
        if (staff.latitude && staff.longitude) {
          coords = { lat: staff.latitude, lng: staff.longitude };
          staffWithCoords++;
        } else {
          staffWithoutCoords++;
        }

        if (coords) {
          result.push({
            id: `staff-${staff.id}`,
            name: staff.preferred_name || staff.legal_full_name,
            type: 'internal',
            lat: coords.lat,
            lng: coords.lng,
            location: staff.address,
            email: staff.company_email || staff.personal_email,
            phone: staff.phone,
            services: staff.signed_off_services || [],
            data: staff,
          });
        }
      }

      if (staffWithoutCoords > 0) {
        console.log(`Staff photographers: ${staffWithCoords} with coordinates, ${staffWithoutCoords} without`);
      }

      // Process third-party - only include those with coordinates
      let withCoords = 0;
      let withoutCoords = 0;
      for (const thirdParty of thirdPartyList) {
        if (thirdParty.latitude && thirdParty.longitude) {
          withCoords++;
          result.push({
            id: `3p-${thirdParty.id}`,
            name: thirdParty.company_name,
            type: 'third-party',
            lat: thirdParty.latitude,
            lng: thirdParty.longitude,
            location: thirdParty.full_address || thirdParty.city,
            email: thirdParty.email,
            phone: thirdParty.phone,
            services: thirdParty.services_offered || [],
            data: thirdParty,
          });
        } else {
          withoutCoords++;
        }
      }

      console.log(`Third-party photographers: ${withCoords} with coordinates, ${withoutCoords} without`);
      setPhotographers(result);
    };

    processPhotographers();
  }, [staffList, thirdPartyList]);

  // Get service group names
  const availableServices = useMemo(() => {
    return serviceGroups.map(group => group.group_name).filter(Boolean);
  }, [serviceGroups]);

  // Filter photographers by service and type
  const filteredPhotographers = useMemo(() => {
    let filtered = photographers;
    
    // Filter by photographer type
    if (photographerType !== 'all') {
      filtered = filtered.filter(p => p.type === photographerType);
    }
    
    // Filter by selected service groups - photographer must have ALL selected services
    if (selectedServices.length > 0) {
      filtered = filtered.filter(p => {
        return selectedServices.every(groupName => {
            const group = serviceGroups.find(g => g.group_name === groupName);
            return group && group.services && group.services.some(s => p.services.includes(s));
          });
        });
        }

        // Filter by staff status (only applies to internal photographers)
        if (staffStatusFilter !== 'all') {
        filtered = filtered.filter(p => {
          if (p.type === 'internal') {
            return p.data?.photographer_status === staffStatusFilter;
          }
          return true; // Don't filter third-party photographers by staff status
        });
        }

        // Calculate distance if search address is provided
    if (searchCoordinates) {
      filtered = filtered.map(p => ({
        ...p,
        distance: calculateDistance(
          searchCoordinates.lat,
          searchCoordinates.lng,
          p.lat,
          p.lng
        ),
      })).sort((a, b) => a.distance - b.distance);
    }

    return filtered;
  }, [photographers, selectedServices, photographerType, searchCoordinates, staffStatusFilter]);

  const handleSearchAddress = async () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);

    const coords = await geocodeAddress(searchAddress, apiKey);
    if (coords) {
      setSearchCoordinates(coords);
      setMapCenter(coords);
      setMapZoom(8); // Zoom to ~100 mile range
    } else {
      alert('Address not found. Please try another address.');
    }
    setIsSearching(false);
  };

  // Auto-trigger search if coordinates are restored from localStorage
  useEffect(() => {
    if (searchCoordinates && searchAddress && mapZoom === 8) {
      // Already searched - coordinates are restored
      setMapCenter(searchCoordinates);
    }
  }, []);

  const mapOptions = {
    mapTypeId: tileLayer === 'satellite' ? 'satellite' : 'roadmap',
  };

  if (apiKeyFailed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          <p className="text-slate-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if ((staffLoading || thirdPartyLoading) && !fetchingApiKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          <p className="text-slate-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-screen flex flex-col">
      {/* Controls */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        {/* Search by Address */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Find Photographers Near Address</label>
          <div className="flex gap-2">
            <AddressAutocomplete
              placeholder="Enter address or location..."
              value={searchAddress}
              onChange={(value) => setSearchAddress(value)}
            />
            <Button 
              className="bg-cyan-600 hover:bg-cyan-700" 
              onClick={handleSearchAddress}
              disabled={isSearching}
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
          {searchCoordinates && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchCoordinates(null);
                setSearchAddress('');
                setMapCenter({ lat: 39.8283, lng: -98.5795 });
                setMapZoom(4); // Reset to full US view
              }}
            >
              Clear Search
            </Button>
          )}
        </div>

        {/* Photographer Type Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Filter by Type</label>
          <div className="flex flex-wrap gap-2">
            <Badge 
              className={`cursor-pointer transition-colors ${photographerType === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
              onClick={() => setPhotographerType('all')}
            >
              All Photographers
            </Badge>
            <Badge 
              className={`cursor-pointer transition-colors ${photographerType === 'internal' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
              onClick={() => setPhotographerType('internal')}
            >
              Staff Only
            </Badge>
            <Badge 
              className={`cursor-pointer transition-colors ${photographerType === 'third-party' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
              onClick={() => setPhotographerType('third-party')}
            >
              3rd Party Only
            </Badge>
          </div>
        </div>

        {/* Staff Status Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Filter Staff by Status</label>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setStaffStatusFilter('training')}
              className="text-xs"
            >
              Add Trainees
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge 
              className={`cursor-pointer transition-colors ${staffStatusFilter === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
              onClick={() => setStaffStatusFilter('all')}
            >
              All Staff
            </Badge>
            <Badge 
              className={`cursor-pointer transition-colors ${staffStatusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
              onClick={() => setStaffStatusFilter('active')}
            >
              Active
            </Badge>
            <Badge 
              className={`cursor-pointer transition-colors ${staffStatusFilter === 'training' ? 'bg-yellow-600 text-white' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
              onClick={() => setStaffStatusFilter('training')}
            >
              Training
            </Badge>
          </div>
        </div>

        {/* Service Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Filter by Service (Select Multiple)</label>
          <div className="flex flex-wrap gap-2">
            {availableServices.length === 0 ? (
              <p className="text-sm text-slate-500">No services available</p>
            ) : (
              availableServices.map(service => (
                <Badge 
                  key={service}
                  className={`cursor-pointer transition-colors ${
                    selectedServices.includes(service) 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                  }`}
                  onClick={() => {
                    setSelectedServices(prev => 
                      prev.includes(service)
                        ? prev.filter(s => s !== service)
                        : [...prev, service]
                    );
                  }}
                >
                  {service}
                </Badge>
              ))
            )}
          </div>
          {selectedServices.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedServices([])}
            >
              Clear Service Filters
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden min-h-0">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 overflow-hidden relative">
          {/* Map/Satellite Toggle */}
          <div className="absolute top-4 left-4 z-40 bg-white rounded-lg shadow-lg border border-slate-200 flex gap-1 p-1">
            <Button
              size="sm"
              variant={tileLayer === 'map' ? 'default' : 'outline'}
              onClick={() => setTileLayer('map')}
              className="gap-2"
            >
              <MapIcon className="w-4 h-4" />
              Map
            </Button>
            <Button
              size="sm"
              variant={tileLayer === 'satellite' ? 'default' : 'outline'}
              onClick={() => setTileLayer('satellite')}
              className="gap-2"
            >
              <Satellite className="w-4 h-4" />
              Satellite
            </Button>
          </div>

          {apiKey ? (
            <LoadScript googleMapsApiKey={apiKey}>
              <GoogleMap
                mapContainerStyle={{
                  width: '100%',
                  height: '100%',
                  minHeight: '400px',
                }}
                center={mapCenter}
                zoom={mapZoom}
                options={mapOptions}
              >
                {/* Search location marker */}
                {searchCoordinates && (
                  <MarkerF
                    position={searchCoordinates}
                    onClick={() => setSelectedMarker('search')}
                    icon={{
                      path: 'M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
                      fillColor: '#9333ea',
                      fillOpacity: 1,
                      strokeColor: '#fff',
                      strokeWeight: 2,
                      scale: 1.5,
                    }}
                  >
                    {selectedMarker === 'search' && (
                      <InfoWindowF onCloseClick={() => setSelectedMarker(null)}>
                        <div className="text-sm">
                          <p className="font-semibold">Search Location</p>
                          <p className="text-slate-600">{searchAddress}</p>
                        </div>
                      </InfoWindowF>
                    )}
                  </MarkerF>
                )}

                {/* Photographer markers */}
                {filteredPhotographers.map(photographer => {
                  const photoUrl = photographer.type === 'internal' 
                    ? photographer.data?.photo_url
                    : photographer.data?.website;

                  return (
                    <MarkerF
                    key={photographer.id}
                    position={{ lat: photographer.lat, lng: photographer.lng }}
                    onClick={() => {
                      setSelectedMarker(photographer.id);
                      setSelectedPhotographer(photographer);
                    }}
                    icon={photoUrl ? {
                      url: photoUrl,
                      scaledSize: { width: 44, height: 44 },
                      origin: { x: 0, y: 0 },
                      anchor: { x: 22, y: 44 },
                    } : {
                      path: 'M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
                      fillColor: photographer.type === 'internal' ? '#10b981' : '#3b82f6',
                      fillOpacity: 1,
                      strokeColor: '#fff',
                      strokeWeight: 2,
                      scale: 1.5,
                    }}
                  >

                    </MarkerF>
                    );
                    })}
                    </GoogleMap>
            </LoadScript>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
                <p className="text-slate-600">Loading map...</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar List */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-slate-200 overflow-y-auto min-h-0">
          <div className="p-4 border-b border-slate-200 sticky top-0 bg-white">
            <h3 className="font-semibold text-slate-900">
              Photographers ({filteredPhotographers.length})
            </h3>
            {searchCoordinates && (
              <p className="text-xs text-slate-500 mt-1">Sorted by distance</p>
            )}

          </div>

          <div className="space-y-2 p-4">
            {filteredPhotographers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">No photographers found</p>
              </div>
            ) : (
              filteredPhotographers.map(photographer => (
                <Card 
                  key={photographer.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedPhotographer(photographer)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 shrink-0">
                        {photographer.type === 'internal' ? (
                          <User className="w-4 h-4 text-green-600" />
                        ) : (
                          <Building2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">{photographer.name}</p>
                        <p className="text-xs text-slate-500">{photographer.type === 'internal' ? 'Internal' : '3rd Party'}</p>
                      </div>
                    </div>
                    
                    {photographer.distance && (
                      <p className="text-xs text-cyan-600 font-semibold mb-2">
                        📍 {photographer.distance.toFixed(1)} miles
                      </p>
                    )}

                    {photographer.services.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {serviceGroups
                          .filter(group => group.services && group.services.some(s => photographer.services.includes(s)))
                          .map(group => (
                            <Badge key={group.id} variant="secondary" className="text-xs">{group.group_name}</Badge>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      {selectedPhotographer && (
        <Dialog open={!!selectedPhotographer} onOpenChange={() => setSelectedPhotographer(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <div className="space-y-3">
                <DialogTitle className="text-2xl">{selectedPhotographer.name}</DialogTitle>
                {selectedPhotographer.type === 'third-party' && selectedPhotographer.data?.contact_person && (
                  <p className="text-sm text-slate-600">{selectedPhotographer.data.contact_person}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {selectedPhotographer.type === 'internal' ? (
                    <Badge className="bg-green-100 text-green-800 border-green-300">Internal</Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300">3rd Party</Badge>
                  )}
                  {selectedPhotographer.type === 'third-party' && selectedPhotographer.data?.status && (
                    <Badge className={
                      selectedPhotographer.data.status === 'great_service' 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : selectedPhotographer.data.status === 'not_the_best'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        : selectedPhotographer.data.status === 'do_not_use'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : selectedPhotographer.data.status === 'have_not_used'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-slate-100 text-slate-800 border-slate-300'
                    }>
                      {selectedPhotographer.data.status === 'great_service' 
                        ? 'Great Service' 
                        : selectedPhotographer.data.status === 'not_the_best'
                        ? 'Not the best'
                        : selectedPhotographer.data.status === 'do_not_use'
                        ? 'DO not use'
                        : selectedPhotographer.data.status === 'have_not_used'
                        ? 'Have not used'
                        : 'No Status'}
                    </Badge>
                  )}

                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedPhotographer.location && (
                <div className="text-sm">
                  <p className="text-slate-600 font-medium mb-1">Address</p>
                  <p className="text-slate-900">{selectedPhotographer.location}</p>
                </div>
              )}

              {selectedPhotographer.distance && (
                <div className="text-sm">
                  <p className="text-slate-600 font-medium mb-1">Distance</p>
                  <p className="font-semibold text-cyan-600">📍 {selectedPhotographer.distance.toFixed(1)} miles</p>
                </div>
              )}

              {selectedPhotographer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`mailto:${selectedPhotographer.email}`} className="text-cyan-600 hover:underline truncate">
                    {selectedPhotographer.email}
                  </a>
                </div>
              )}

              {selectedPhotographer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`tel:${selectedPhotographer.phone}`} className="text-cyan-600 hover:underline">
                    {selectedPhotographer.phone}
                  </a>
                </div>
              )}

              {selectedPhotographer.type === 'third-party' && selectedPhotographer.data?.website && (
                <div className="text-sm">
                  <p className="text-slate-600 font-medium mb-1">Website</p>
                  <a href={selectedPhotographer.data.website} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline truncate block">
                    {selectedPhotographer.data.website}
                  </a>
                </div>
              )}

              {selectedPhotographer.services.length > 0 && (
                <div className="text-sm">
                  <p className="text-slate-600 font-medium mb-2">Services</p>
                  <div className="flex flex-wrap gap-2">
                    {serviceGroups
                      .filter(group => group.services && group.services.some(s => selectedPhotographer.services.includes(s)))
                      .map(group => (
                        <Badge key={group.id} variant="secondary" className="text-xs">{group.group_name}</Badge>
                      ))}
                  </div>
                </div>
              )}

              {selectedPhotographer.type === 'third-party' && selectedPhotographer.data?.pricing_details && (
                <div className="text-sm">
                  <p className="text-slate-600 font-medium mb-2">Pricing</p>
                  <p className="text-slate-700 bg-slate-50 p-2 rounded text-xs whitespace-pre-wrap">
                    {selectedPhotographer.data.pricing_details}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t mt-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPhotographer(null)}
                className="flex-1"
              >
                Close
              </Button>
              {selectedPhotographer.type === 'third-party' && (
                <Button 
                  onClick={() => window.location.href = createPageUrl('ThirdPartyPhotographerDetail') + `?id=${selectedPhotographer.data.id}`}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                >
                  View Full Details
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}