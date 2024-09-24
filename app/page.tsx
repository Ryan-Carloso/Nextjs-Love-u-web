"use client"; // Add this line at the top of your file

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import DateTimePicker from 'react-datetime-picker'; // Use a web-compatible date-time picker
import Image from 'next/image'; // For images (or you can use a regular <img> tag)

// Initialize Supabase client
const supabase = createClient('https://laqxbdncmapnhorlbbkg.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhcXhiZG5jbWFwbmhvcmxiYmtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg2MTcyNSwiZXhwIjoyMDQyNDM3NzI1fQ.Xr3j4FThRX5C0Zk5txIqobebk6v5FBf2K5Mahe8vdzY');

const DateTimePickerWithSupabase = () => {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [compliment, setCompliment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [imageUris, setImageUris] = useState([]); // Multiple image URIs
  
  // Auth states
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleDateChange = (date) => {
    setDate(date);
  };

  const handleTimeChange = (time) => {
    setTime(time);
  };

  const pickImage = async () => {
    const result = await window.showOpenFilePicker({ multiple: true }); // Allow multiple file selection
    const files = await Promise.all(result.map(fileHandle => fileHandle.getFile()));
    const uris = files.map(file => URL.createObjectURL(file));
    setImageUris(prevUris => [...prevUris, ...uris]); // Add new images to existing ones
  };

  const handleSubmit = async () => {
    if (!user) {
      alert('You must be logged in to submit data.');
      return;
    }

    setLoading(true);

    try {
      if (!date || !time || !compliment) {
        throw new Error('Please fill all fields');
      }

      const dateTime = new Date(date);
      dateTime.setHours(time.getHours(), time.getMinutes());

      const data = {
        date_time: dateTime.toISOString(),
        elogios: JSON.stringify({ text: compliment }),
      };

      // Upload all images
      if (imageUris.length > 0) {
        const imageUrls = await Promise.all(imageUris.map(async (uri) => {
          const response = await fetch(uri);
          const blob = await response.blob();
          const { error: storageError, data: storageData } = await supabase.storage
            .from('images')
            .upload(`compliment-${Date.now()}-${Math.random()}.jpg`, blob, {
              contentType: 'image/jpeg',
            });
          if (storageError) throw storageError;
          return storageData.path;
        }));

        data.image_urls = imageUrls; // Save all image URLs
      }

      const { error } = await supabase.from('users').insert(data);

      if (error) throw error;

      alert('Data submitted successfully!');
      setDate(new Date());
      setTime(new Date());
      setCompliment('');
      setImageUris([]); // Clear selected images after submission
    } catch (error) {
      console.error('Error submitting data:', error);
      alert('Error submitting data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMagicLink = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('Error:', error.message);
      alert(error.message);
    } else {
      alert('Check your email for the magic link!');
    }
  };

  return (
    <div className="flex flex-col p-4 bg-white">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          className="mt-1 p-2 border border-gray-300 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>

      <button onClick={sendMagicLink} className="bg-blue-500 text-white py-2 px-4 rounded">
        Send Magic Link
      </button>

      {user && (
        <>
          <div className="mt-4 mb-4">
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <button onClick={() => setShowDatePicker(true)} className="mt-1 p-2 border border-gray-300 rounded">
              <span>{format(date, 'PPP')}</span>
            </button>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                onChange={handleDateChange}
                format="y-MM-dd"
              />
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <button onClick={() => setShowTimePicker(true)} className="mt-1 p-2 border border-gray-300 rounded">
              <span>{format(time, 'p')}</span>
            </button>
            {showTimePicker && (
              <DateTimePicker
                value={time}
                onChange={handleTimeChange}
                format="h:mm a"
              />
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Compliment</label>
            <textarea
              className="mt-1 p-2 border border-gray-300 rounded"
              value={compliment}
              onChange={(e) => setCompliment(e.target.value)}
              placeholder="Enter your compliment here"
              rows={4}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Images</label>
            <button onClick={pickImage} className="mt-1 p-2 border border-gray-300 rounded">
              <span>Select Images</span>
            </button>
            {imageUris.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {imageUris.map((uri, index) => (
                  <div key={index}>
                    <img src={uri} alt={`Selected image ${index + 1}`} className="object-cover w-full h-32" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`mt-4 bg-blue-500 text-white py-2 px-4 rounded ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </>
      )}
    </div>
  );
};

export default DateTimePickerWithSupabase;
