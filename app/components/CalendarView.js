'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function CalendarView({ user, userProfile, trips: initialTrips, drivers = [] }) {
  const router = useRouter();
  const [trips, setTrips] = useState(initialTrips || []);
  const [filteredTrips, setFilteredTrips] = useState(initialTrips || []);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Filter trips based on selected driver
  useEffect(() => {
    if (selectedDriver === 'all') {
      setFilteredTrips(trips);
    } else if (selectedDriver === 'unassigned') {
      setFilteredTrips(trips.filter(trip => !trip.driver_id));
    } else {
      setFilteredTrips(trips.filter(trip => trip.driver_id === selectedDriver));
    }
  }, [selectedDriver, trips]);

  // Group trips by date for the calendar view
  const tripsByDate = filteredTrips.reduce((acc, trip) => {
    const date = new Date(trip.pickup_time);
    const dateStr = date.toISOString().split('T')[0];
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(trip);
    return acc;
  }, {});

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const totalDaysInMonth = lastDay.getDate();
    
    // Create days array with empty slots for previous month days
    const days = Array(startingDayOfWeek).fill(null);
    
    // Add the days of the current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigate to previous/next month
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  // Show trip details
  const showTripDetails = (trip) => {
    setSelectedTrip(trip);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedTrip(null);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showModal) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showModal]);

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen">
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status and driver filters */}
        <div className="bg-brand-card shadow rounded-lg py-2 px-4 mb-6 border border-brand-border">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex flex-wrap items-center my-2">
              <span className="font-medium mr-6">Status:</span>
              {['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map(status => (
                <div key={status} className="flex items-center mr-6 py-1">
                  <input
                    id={`filter-${status.toLowerCase().replace(' ', '-')}`}
                    type="checkbox"
                    className="h-4 w-4 text-brand-accent rounded border-brand-border flex-shrink-0"
                    defaultChecked={status === 'All'}
                  />
                  <label htmlFor={`filter-${status.toLowerCase().replace(' ', '-')}`} className="ml-2 text-sm whitespace-nowrap">
                    {status}
                  </label>
                </div>
              ))}
            </div>
            
            {/* Driver filter */}
            <div className="flex items-center my-2">
              <span className="font-medium mr-3">Driver:</span>
              <div className="relative inline-block w-64">
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="block appearance-none w-full bg-brand-background border border-brand-border rounded-md py-2 pl-3 pr-10 text-sm"
                >
                  <option value="all">All Drivers</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.first_name && driver.last_name 
                        ? `${driver.first_name} ${driver.last_name}`
                        : driver.email || `Driver ${driver.id.substring(0, 6)}`}
                    </option>
                  ))}
                  <option value="unassigned">Unassigned Trips</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-accent">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Calendar view */}
        <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
          <div className="mb-4 flex flex-col sm:flex-row sm:justify-between items-center">
            <div className="mb-4 sm:mb-0 flex items-center">
              <button onClick={goToPreviousMonth} className="p-2 rounded-md hover:bg-brand-border/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button onClick={goToNextMonth} className="p-2 rounded-md hover:bg-brand-border/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="mx-2 text-lg font-semibold">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button onClick={goToToday} className="ml-2 px-3 py-1 text-sm rounded-md bg-brand-border/20 hover:bg-brand-border/30">
                Today
              </button>
            </div>
            <div className="flex items-center">
              <button className="px-3 py-1 text-sm rounded-md bg-brand-border/20 hover:bg-brand-border/30 mr-2">
                Month
              </button>
              <button className="px-3 py-1 text-sm rounded-md hover:bg-brand-border/20 mr-2">
                Week
              </button>
              <button className="px-3 py-1 text-sm rounded-md hover:bg-brand-border/20">
                Day
              </button>
            </div>
          </div>
          
          {/* Calendar grid */}
          <div className="mt-4 grid grid-cols-7 gap-1">
            {/* Calendar header */}
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center font-medium text-sm">
                {day}
              </div>
            ))}
            
            {/* Calendar cells */}
            {calendarDays.map((day, index) => {
              if (!day) {
                // Empty cell for days before the start of the month
                return <div key={`empty-${index}`} className="bg-brand-border/5 h-24 p-1"></div>;
              }
              
              const dateStr = day.toISOString().split('T')[0];
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = day.toDateString() === selectedDate.toDateString();
              const dayTrips = tripsByDate[dateStr] || [];
              
              return (
                <div 
                  key={dateStr}
                  className={`relative h-24 p-1 border border-brand-border/30 overflow-hidden hover:bg-brand-border/5 cursor-pointer ${
                    isToday ? 'bg-brand-border/10' : ''
                  } ${isSelected ? 'ring-2 ring-brand-accent' : ''}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="absolute top-1 left-1 h-6 w-6 flex items-center justify-center">
                    <span className={`text-sm ${isToday ? 'font-bold text-brand-accent' : ''}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  
                  <div className="mt-6 text-xs space-y-1">
                    {dayTrips.slice(0, 3).map((trip, idx) => (
                      <div 
                        key={idx} 
                        onClick={(e) => {
                          e.stopPropagation();
                          showTripDetails(trip);
                        }}
                        className={`rounded-sm px-1 py-0.5 truncate cursor-pointer hover:opacity-80 transition-opacity ${
                          trip.status === 'completed' ? 'bg-brand-completed/20 text-brand-completed' : 
                          trip.status === 'in_progress' ? 'bg-brand-inProgress/20 text-brand-inProgress' : 
                          trip.status === 'cancelled' ? 'bg-brand-cancelled/20 text-brand-cancelled' : 
                          trip.status === 'upcoming' ? 'bg-brand-upcoming/20 text-brand-upcoming' : 
                          'bg-brand-pending/20 text-brand-pending'
                        }`}
                      >
                        {new Date(trip.pickup_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {trip.client_name || 'Client'}
                        {trip.driver_name && <span className="ml-1 text-xs opacity-75"> ({trip.driver_name})</span>}
                      </div>
                    ))}
                    {dayTrips.length > 3 && (
                      <div className="text-xs opacity-70">+ {dayTrips.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      
      {/* Trip Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              aria-hidden="true"
              onClick={closeModal}
            ></div>

            {/* Modal content */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-brand-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-brand-border">
              {selectedTrip && (
                <>
                  <div className="px-6 py-5 border-b border-brand-border flex justify-between items-center">
                    <h3 className="text-lg font-medium" id="modal-title">Trip Details</h3>
                    <button
                      onClick={closeModal}
                      className="rounded-md hover:bg-brand-border/20 p-1"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="px-6 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Trip information - left column */}
                      <div className="md:col-span-2">
                        <div className="mb-6">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-md font-medium">Trip Information</h4>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium
                              ${selectedTrip.status === 'completed' ? 'bg-brand-completed/20 text-brand-completed' : 
                                selectedTrip.status === 'in_progress' ? 'bg-brand-inProgress/20 text-brand-inProgress' : 
                                selectedTrip.status === 'cancelled' ? 'bg-brand-cancelled/20 text-brand-cancelled' : 
                                selectedTrip.status === 'upcoming' ? 'bg-brand-upcoming/20 text-brand-upcoming' : 
                                'bg-brand-pending/20 text-brand-pending'}`}>
                              {selectedTrip.status.replace('_', ' ')}
                            </span>
                          </div>
                          <dl className="grid grid-cols-1 gap-x-4 gap-y-4">
                            <div>
                              <dt className="text-sm font-medium opacity-70">Pickup Time</dt>
                              <dd className="mt-1 text-sm">{formatTime(selectedTrip.pickup_time)}</dd>
                            </div>
                            
                            {selectedTrip.return_pickup_time && (
                              <div>
                                <dt className="text-sm font-medium opacity-70">Return Pickup Time</dt>
                                <dd className="mt-1 text-sm">{formatTime(selectedTrip.return_pickup_time)}</dd>
                              </div>
                            )}
                            
                            <div>
                              <dt className="text-sm font-medium opacity-70">Route</dt>
                              <dd className="mt-1 text-sm">
                                <div className="flex items-center mb-2">
                                  <span className="h-2 w-2 rounded-full bg-brand-completed inline-block mr-2 flex-shrink-0"></span>
                                  <span>{selectedTrip.pickup_location}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="h-2 w-2 rounded-full bg-brand-cancelled inline-block mr-2 flex-shrink-0"></span>
                                  <span>{selectedTrip.dropoff_location}</span>
                                </div>
                              </dd>
                            </div>
                            
                            <div>
                              <dt className="text-sm font-medium opacity-70">Estimated Duration</dt>
                              <dd className="mt-1 text-sm">{selectedTrip.estimated_duration || 30} minutes</dd>
                            </div>
                            
                            {selectedTrip.special_requirements && (
                              <div>
                                <dt className="text-sm font-medium opacity-70">Special Requirements</dt>
                                <dd className="mt-1 text-sm">{selectedTrip.special_requirements}</dd>
                              </div>
                            )}
                            
                            {selectedTrip.notes && (
                              <div>
                                <dt className="text-sm font-medium opacity-70">Notes</dt>
                                <dd className="mt-1 text-sm">{selectedTrip.notes}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>
                      
                      {/* Client and driver information - right column */}
                      <div>
                        {/* Client information */}
                        <div className="mb-6">
                          <h4 className="text-md font-medium mb-3">Client Information</h4>
                          {selectedTrip.client_name ? (
                            <dl className="space-y-2">
                              <div>
                                <dt className="text-sm font-medium opacity-70">Name</dt>
                                <dd className="mt-1 text-sm">
                                  {selectedTrip.client_name}
                                </dd>
                              </div>
                              {selectedTrip.phone_number && (
                                <div>
                                  <dt className="text-sm font-medium opacity-70">Phone</dt>
                                  <dd className="mt-1 text-sm">{selectedTrip.phone_number}</dd>
                                </div>
                              )}
                              {selectedTrip.user_id && (
                                <div>
                                  <dt className="text-sm font-medium opacity-70">User ID</dt>
                                  <dd className="mt-1 text-sm text-xs opacity-60">{selectedTrip.user_id.substring(0, 8)}...</dd>
                                </div>
                              )}
                            </dl>
                          ) : (
                            <p className="text-sm opacity-70">Client information not available</p>
                          )}
                        </div>
                        
                        {/* Driver information */}
                        <div>
                          <h4 className="text-md font-medium mb-3">Driver Information</h4>
                          {selectedTrip.driver_name ? (
                            <dl className="space-y-2">
                              <div>
                                <dt className="text-sm font-medium opacity-70">Name</dt>
                                <dd className="mt-1 text-sm">
                                  {selectedTrip.driver_name}
                                </dd>
                              </div>
                              {selectedTrip.driver_phone && (
                                <div>
                                  <dt className="text-sm font-medium opacity-70">Phone</dt>
                                  <dd className="mt-1 text-sm">{selectedTrip.driver_phone}</dd>
                                </div>
                              )}
                            </dl>
                          ) : (
                            <p className="text-sm opacity-70">No driver assigned to this trip</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-brand-border/10 flex justify-between items-center">
                    <button
                      onClick={() => {
                        closeModal();
                        router.push(`/trips/${selectedTrip.id}`);
                      }}
                      className="text-sm text-brand-accent hover:underline"
                    >
                      View Full Details
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-brand-accent text-white hover:opacity-90"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}