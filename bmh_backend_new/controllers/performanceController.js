const pool = require('../db');

// Haversine formula to calculate distance in KM
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Radius of the Earth in KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Robust coordinate parser supporting DMS, Decimal, and Google Map URLs
function parseCoordinates(link) {
  if (!link) return null;
  link = link.trim();
  
  // Pattern 1: Decimal coordinates e.g. "21.96075,86.742305"
  const decimalRegex = /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/;
  const decMatch = link.match(decimalRegex);
  if (decMatch) {
    return {
      lat: parseFloat(decMatch[1]),
      lng: parseFloat(decMatch[2])
    };
  }

  // Pattern 2: DMS format e.g. "21°57'38.7\"N 86°44'32.3\"E"
  const dmsRegex = /(\d+)°(\d+)'([\d.]+)"([NS])\s+(\d+)°(\d+)'([\d.]+)"([EW])/i;
  const dmsMatch = link.match(dmsRegex);
  if (dmsMatch) {
    const convertDMS = (deg, min, sec, dir) => {
      let dd = parseFloat(deg) + parseFloat(min)/60 + parseFloat(sec)/3600;
      if (dir === 'S' || dir === 'W') dd = -dd;
      return dd;
    };
    const lat = convertDMS(dmsMatch[1], dmsMatch[2], dmsMatch[3], dmsMatch[4]);
    const lng = convertDMS(dmsMatch[5], dmsMatch[6], dmsMatch[7], dmsMatch[8]);
    return { lat, lng };
  }

  // Pattern 3: Google Maps link with query parameter ?q=lat,lng
  if (link.includes('?q=')) {
    const parts = link.split('?q=')[1];
    if (parts) {
      const coords = parts.split('&')[0].split(',');
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  // Pattern 4: Google Maps path link e.g. maps.google.com/maps/place/lat,lng
  const placeRegex = /\/place\/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
  const placeMatch = link.match(placeRegex);
  if (placeMatch) {
    return {
      lat: parseFloat(placeMatch[1]),
      lng: parseFloat(placeMatch[2])
    };
  }

  // Pattern 5: URL containing `@` coordinates e.g. @17.3850,78.4867
  const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const atMatch = link.match(atRegex);
  if (atMatch) {
    return {
      lat: parseFloat(atMatch[1]),
      lng: parseFloat(atMatch[2])
    };
  }

  return null;
}

exports.getAdminPerformanceStats = async (req, res) => {
  try {
    const { date, week, month, year, delivery_boy_id, shift, vehicle_type } = req.query;

    // 1. Fetch delivery boys (employees where department = 'Delivery' or role = 'Hd delivery')
    let riderQuery = `
      SELECT id, full_name, email, mobile, schedule_in, schedule_out, created_at 
      FROM employees 
      WHERE (department = 'Delivery' OR role = 'Hd delivery') AND status = 'approved'
    `;
    let riderParams = [];
    if (delivery_boy_id) {
      riderQuery += ` AND id = $1`;
      riderParams.push(delivery_boy_id);
    }
    const ridersRes = await pool.query(riderQuery, riderParams);
    const riders = ridersRes.rows;

    // 2. Fetch department default location coordinates (for distance calculation)
    const deptRes = await pool.query(`
      SELECT allowed_latitude, allowed_longitude FROM departments 
      WHERE name = 'Delivery' LIMIT 1
    `);
    const deptLat = deptRes.rows[0]?.allowed_latitude ? parseFloat(deptRes.rows[0].allowed_latitude) : 17.3850;
    const deptLng = deptRes.rows[0]?.allowed_longitude ? parseFloat(deptRes.rows[0].allowed_longitude) : 78.4867;

    const compiledRidersStats = [];
    let totalAllAssigned = 0;
    let totalAllDelivered = 0;
    let totalAllFailed = 0;
    let totalAllReturned = 0;
    let totalAllCancelled = 0;
    let totalAllPending = 0;
    let totalAllTime = 0;
    let totalAllDistance = 0;
    let totalAllCash = 0;
    let totalAllOnline = 0;

    for (const rider of riders) {
      const riderId = rider.id;

      // Filter construction helper
      let dateFilter = '';
      let filterParams = [riderId];
      let paramIndex = 2;

      if (date) {
        dateFilter = ` AND TO_CHAR(created_at, 'YYYY-MM-DD') = $${paramIndex}`;
        filterParams.push(date);
        paramIndex++;
      } else if (month) {
        dateFilter = ` AND TO_CHAR(created_at, 'YYYY-MM') = $${paramIndex}`;
        filterParams.push(month);
        paramIndex++;
      } else if (year) {
        dateFilter = ` AND TO_CHAR(created_at, 'YYYY') = $${paramIndex}`;
        filterParams.push(year);
        paramIndex++;
      }

      // Query manual orders joining delivery addresses
      let manualQuery = `
        SELECT mo.*, da.latitude as addr_lat, da.longitude as addr_lng
        FROM manual_orders mo
        LEFT JOIN (
          SELECT mobile, MAX(latitude) as latitude, MAX(longitude) as longitude
          FROM delivery_addresses
          GROUP BY mobile
        ) da ON (da.mobile = mo.customer_phone OR da.mobile = mo.ship_to_phone)
        WHERE mo.delivery_boy_id = $1
      ` + dateFilter.replace(/created_at/g, 'mo.created_at');
      const manualRes = await pool.query(manualQuery, filterParams);
      
      // Query online orders joining delivery addresses
      let onlineQuery = `
        SELECT oo.*, da.latitude as addr_lat, da.longitude as addr_lng
        FROM online_orders oo
        LEFT JOIN (
          SELECT mobile, MAX(latitude) as latitude, MAX(longitude) as longitude
          FROM delivery_addresses
          GROUP BY mobile
        ) da ON (da.mobile = oo.patient_mobile)
        WHERE oo.delivery_boy_id = $1
      ` + dateFilter.replace(/created_at/g, 'oo.created_at');
      const onlineRes = await pool.query(onlineQuery, filterParams);

      // Query sales orders joining delivery addresses
      let salesQuery = `
        SELECT so.*, da.latitude as addr_lat, da.longitude as addr_lng
        FROM ecogreen_sales_orders so
        LEFT JOIN (
          SELECT mobile, MAX(latitude) as latitude, MAX(longitude) as longitude
          FROM delivery_addresses
          GROUP BY mobile
        ) da ON (da.mobile = so.mobile_no)
        WHERE so.delivery_boy_id = $1
      ` + dateFilter.replace(/created_at/g, 'so.created_at');
      const salesRes = await pool.query(salesQuery, filterParams);

      // Query sales invoices joining delivery addresses
      let invoiceQuery = `
        SELECT si.*, da.latitude as addr_lat, da.longitude as addr_lng
        FROM ecogreen_sales_invoices si
        LEFT JOIN (
          SELECT mobile, MAX(latitude) as latitude, MAX(longitude) as longitude
          FROM delivery_addresses
          GROUP BY mobile
        ) da ON (da.mobile = si.mobile_no)
        WHERE si.delivery_boy_id = $1
      ` + dateFilter.replace(/created_at/g, 'si.created_at');
      const invoiceRes = await pool.query(invoiceQuery, filterParams);

      // Unified order aggregation
      const allOrders = [
        ...manualRes.rows.map(o => {
          let coords = parseCoordinates(o.location_link);
          let lat = coords ? coords.lat : null;
          let lng = coords ? coords.lng : null;
          if ((lat == null || lng == null) && o.addr_lat != null && o.addr_lng != null) {
            lat = parseFloat(o.addr_lat);
            lng = parseFloat(o.addr_lng);
          }
          return { status: o.status, type: 'manual', amount: parseFloat(o.amount || 0), paymentMode: o.payment_mode || o.pod_payment_mode || 'Cash', lat, lng, created: o.created_at, delivered: o.delivered_at, picked: o.picked_up_at };
        }),
        ...onlineRes.rows.map(o => {
          let lat = o.map_lat ? parseFloat(o.map_lat) : null;
          let lng = o.map_lng ? parseFloat(o.map_lng) : null;
          if ((lat == null || lng == null || lat === 0 || lng === 0) && o.addr_lat != null && o.addr_lng != null) {
            lat = parseFloat(o.addr_lat);
            lng = parseFloat(o.addr_lng);
          }
          return { status: o.status, type: 'online', amount: parseFloat(o.total_amount || 0), paymentMode: o.pod_payment_mode || 'Online', lat, lng, created: o.created_at, delivered: o.updated_at, picked: o.created_at };
        }),
        ...salesRes.rows.map(o => {
          let lat = o.addr_lat ? parseFloat(o.addr_lat) : null;
          let lng = o.addr_lng ? parseFloat(o.addr_lng) : null;
          return { status: o.status, type: 'sales_order', amount: parseFloat(o.order_total || 0), paymentMode: 'Cash', lat, lng, created: o.created_at, delivered: o.created_at, picked: o.created_at };
        }),
        ...invoiceRes.rows.map(o => {
          let lat = o.addr_lat ? parseFloat(o.addr_lat) : null;
          let lng = o.addr_lng ? parseFloat(o.addr_lng) : null;
          return { status: o.status, type: 'sales_invoice', amount: parseFloat(o.order_total || 0), paymentMode: 'Cash', lat, lng, created: o.created_at, delivered: o.created_at, picked: o.created_at };
        })
      ];

      // Counters
      const assigned = allOrders.length;
      let delivered = 0;
      let failed = 0;
      let returned = 0;
      let cancelled = 0;
      let pending = 0;
      let cashCollected = 0;
      let onlineCollected = 0;
      let totalDurationSec = 0;
      let durationCount = 0;
      let totalDistance = 0;

      allOrders.forEach(o => {
        const statusClean = o.status?.toLowerCase() || '';
        
        if (statusClean.includes('delivered') || statusClean.includes('completed')) {
          delivered++;
          // Cash vs Online mapping
          const pMode = o.paymentMode?.toLowerCase() || '';
          if (pMode.includes('online') || pMode.includes('digital') || pMode.includes('upi') || pMode.includes('card')) {
            onlineCollected += o.amount;
          } else {
            cashCollected += o.amount;
          }

          // Duration calculation (Delivered Time - Picked Up/Created Time)
          if (o.delivered && o.picked) {
            const diffMs = new Date(o.delivered) - new Date(o.picked);
            if (diffMs > 0) {
              totalDurationSec += Math.floor(diffMs / 1000);
              durationCount++;
            }
          }

          // Distance calculation
          let distance = 0;
          if (o.lat != null && o.lng != null && o.lat !== 0 && o.lng !== 0) {
            distance = getHaversineDistance(deptLat, deptLng, o.lat, o.lng) || 0;
          }
          totalDistance += distance;

        } else if (statusClean.includes('cancel')) {
          cancelled++;
        } else if (statusClean.includes('return')) {
          returned++;
        } else if (statusClean.includes('fail') || statusClean.includes('not available')) {
          failed++;
        } else {
          pending++;
        }
      });

      // Working days & hours from attendance logs
      let attQuery = `SELECT * FROM attendance WHERE employee_id = $1` + dateFilter.replace('created_at', 'date');
      const attRes = await pool.query(attQuery, filterParams);
      const workingDaysCount = attRes.rowCount;
      let workingHours = 0;
      attRes.rows.forEach(a => {
        if (a.checkin_timestamp && a.checkout_timestamp) {
          const hours = (new Date(a.checkout_timestamp) - new Date(a.checkin_timestamp)) / (1000 * 60 * 60);
          if (hours > 0) workingHours += hours;
        } else if (a.checkin_timestamp) {
          workingHours += 8; // Default shift duration if not checked out yet
        }
      });
      if (workingHours === 0 && workingDaysCount > 0) {
        workingHours = workingDaysCount * 9; // Fallback to standard shift duration
      }

      // Average Delivery duration in minutes (0 if no timestamps)
      const avgDeliveryTimeMin = durationCount > 0 ? Math.round((totalDurationSec / 60) / durationCount) : 0;

      // Rate formulas
      const successRate = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
      const cancellationRate = assigned > 0 ? Math.round((cancelled / assigned) * 100) : 0;
      const returnRate = assigned > 0 ? Math.round((returned / assigned) * 100) : 0;

      // Rating: 5.0 base score minus deductions for failures and cancellations
      let ratingClean = 0.0;
      if (delivered > 0 || failed > 0 || cancelled > 0) {
        const ratingVal = 5.0 - (failed * 0.2) - (cancelled * 0.1);
        ratingClean = parseFloat(Math.min(5, Math.max(1, ratingVal)).toFixed(2));
      }
      compiledRidersStats.push({
        riderId,
        name: rider.full_name,
        phone: rider.mobile,
        email: rider.email,
        shift: `${rider.schedule_in || '09:00'} - ${rider.schedule_out || '18:00'}`,
        joiningDate: rider.created_at,
        assigned,
        delivered,
        failed,
        returned,
        cancelled,
        pending,
        successRate,
        cancellationRate,
        returnRate,
        avgDeliveryTimeMin,
        totalDistanceKM: parseFloat(totalDistance.toFixed(2)),
        workingDays: workingDaysCount,
        workingHours: parseFloat(workingHours.toFixed(1)),
        cashCollected,
        onlineCollected,
        rating: ratingClean
      });

      // Sum all totals for executive metrics
      totalAllAssigned += assigned;
      totalAllDelivered += delivered;
      totalAllFailed += failed;
      totalAllReturned += returned;
      totalAllCancelled += cancelled;
      totalAllPending += pending;
      totalAllTime += avgDeliveryTimeMin;
      totalAllDistance += totalDistance;
      totalAllCash += cashCollected;
      totalAllOnline += onlineCollected;
    }

    const totalRidersCount = riders.length;
    const overallAvgDeliveryTime = totalRidersCount > 0 ? Math.round(totalAllTime / totalRidersCount) : 0;
    const overallSuccessRate = totalAllAssigned > 0 ? Math.round((totalAllDelivered / totalAllAssigned) * 100) : 0;
    
    // Sort riders by success rate (or order volume)
    const sortedRiders = [...compiledRidersStats].sort((a, b) => b.delivered - a.delivered);
    const topExecutives = sortedRiders.slice(0, 5);
    const bottomExecutives = sortedRiders.slice(-5).reverse();

    res.json({
      success: true,
      executiveDashboard: {
        totalOrdersAssigned: totalAllAssigned,
        totalOrdersDelivered: totalAllDelivered,
        deliverySuccessRate: overallSuccessRate,
        failedDeliveries: totalAllFailed,
        returnedOrders: totalAllReturned,
        cancelledOrders: totalAllCancelled,
        pendingDeliveries: totalAllPending,
        averageDeliveryTimeMin: overallAvgDeliveryTime,
        totalDistanceKM: parseFloat(totalAllDistance.toFixed(2)),
        totalCashCollected: totalAllCash,
        totalOnlinePayments: totalAllOnline,
        topExecutives,
        bottomExecutives
      },
      riders: compiledRidersStats
    });
  } catch (error) {
    console.error('Error fetching admin performance statistics:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

exports.getDeliveryBoyPerformanceStats = async (req, res) => {
  try {
    const { riderId } = req.params;
    const { month } = req.query; // format: 'YYYY-MM'

    // Simple lookup of employee details
    const riderRes = await pool.query(`
      SELECT id, full_name, mobile, email, schedule_in, schedule_out, created_at 
      FROM employees WHERE id = $1 AND role = 'Hd delivery'
    `, [riderId]);

    if (riderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Rider not found' });
    }
    const rider = riderRes.rows[0];

    // Fetch department default location coordinates (for distance calculation)
    const deptRes = await pool.query(`
      SELECT allowed_latitude, allowed_longitude FROM departments 
      WHERE name = 'Delivery' LIMIT 1
    `);
    const deptLat = deptRes.rows[0]?.allowed_latitude ? parseFloat(deptRes.rows[0].allowed_latitude) : 17.3850;
    const deptLng = deptRes.rows[0]?.allowed_longitude ? parseFloat(deptRes.rows[0].allowed_longitude) : 78.4867;

    // Filter construction helper
    let dateFilter = '';
    let filterParams = [riderId];
    if (month) {
      dateFilter = ` AND TO_CHAR(created_at, 'YYYY-MM') = $2`;
      filterParams.push(month);
    } else {
      const currentMonth = new Date().toISOString().substring(0, 7);
      dateFilter = ` AND TO_CHAR(created_at, 'YYYY-MM') = $2`;
      filterParams.push(currentMonth);
    }

    // Queries joining delivery addresses
    const manualRes = await pool.query(`
      SELECT mo.*, da.latitude as addr_lat, da.longitude as addr_lng
      FROM manual_orders mo
      LEFT JOIN (
        SELECT mobile, MAX(latitude) as latitude, MAX(longitude) as longitude
        FROM delivery_addresses
        GROUP BY mobile
      ) da ON (da.mobile = mo.customer_phone OR da.mobile = mo.ship_to_phone)
      WHERE mo.delivery_boy_id = $1
    ` + dateFilter.replace(/created_at/g, 'mo.created_at'), filterParams);

    const onlineRes = await pool.query(`
      SELECT oo.*, da.latitude as addr_lat, da.longitude as addr_lng
      FROM online_orders oo
      LEFT JOIN (
        SELECT mobile, MAX(latitude) as latitude, MAX(longitude) as longitude
        FROM delivery_addresses
        GROUP BY mobile
      ) da ON (da.mobile = oo.patient_mobile)
      WHERE oo.delivery_boy_id = $1
    ` + dateFilter.replace(/created_at/g, 'oo.created_at'), filterParams);

    const salesRes = await pool.query(`
      SELECT so.*, da.latitude as addr_lat, da.longitude as addr_lng
      FROM ecogreen_sales_orders so
      LEFT JOIN (
        SELECT mobile, MAX(latitude) as latitude, MAX(longitude) as longitude
        FROM delivery_addresses
        GROUP BY mobile
      ) da ON (da.mobile = so.mobile_no)
      WHERE so.delivery_boy_id = $1
    ` + dateFilter.replace(/created_at/g, 'so.created_at'), filterParams);

    const invoiceRes = await pool.query(`
      SELECT si.*, da.latitude as addr_lat, da.longitude as addr_lng
      FROM ecogreen_sales_invoices si
      LEFT JOIN (
        SELECT mobile, MAX(latitude) as latitude, MAX(longitude) as longitude
        FROM delivery_addresses
        GROUP BY mobile
      ) da ON (da.mobile = si.mobile_no)
      WHERE si.delivery_boy_id = $1
    ` + dateFilter.replace(/created_at/g, 'si.created_at'), filterParams);

    const allOrders = [
      ...manualRes.rows.map(o => {
        let coords = parseCoordinates(o.location_link);
        let lat = coords ? coords.lat : null;
        let lng = coords ? coords.lng : null;
        if ((lat == null || lng == null) && o.addr_lat != null && o.addr_lng != null) {
          lat = parseFloat(o.addr_lat);
          lng = parseFloat(o.addr_lng);
        }
        return { status: o.status, amount: parseFloat(o.amount || 0), created: o.created_at, delivered: o.delivered_at, picked: o.picked_up_at, lat, lng };
      }),
      ...onlineRes.rows.map(o => {
        let lat = o.map_lat ? parseFloat(o.map_lat) : null;
        let lng = o.map_lng ? parseFloat(o.map_lng) : null;
        if ((lat == null || lng == null || lat === 0 || lng === 0) && o.addr_lat != null && o.addr_lng != null) {
          lat = parseFloat(o.addr_lat);
          lng = parseFloat(o.addr_lng);
        }
        return { status: o.status, amount: parseFloat(o.total_amount || 0), created: o.created_at, delivered: o.updated_at, picked: o.created_at, lat, lng };
      }),
      ...salesRes.rows.map(o => {
        let lat = o.addr_lat ? parseFloat(o.addr_lat) : null;
        let lng = o.addr_lng ? parseFloat(o.addr_lng) : null;
        return { status: o.status, amount: parseFloat(o.order_total || 0), created: o.created_at, delivered: o.created_at, picked: o.created_at, lat, lng };
      }),
      ...invoiceRes.rows.map(o => {
        let lat = o.addr_lat ? parseFloat(o.addr_lat) : null;
        let lng = o.addr_lng ? parseFloat(o.addr_lng) : null;
        return { status: o.status, amount: parseFloat(o.order_total || 0), created: o.created_at, delivered: o.created_at, picked: o.created_at, lat, lng };
      })
    ];

    const assigned = allOrders.length;
    let delivered = 0;
    let cancelled = 0;
    let returned = 0;
    let failed = 0;
    let pending = 0;
    let totalDeliveryValue = 0;
    let totalDurationSec = 0;
    let durationCount = 0;
    let totalDistance = 0;

    allOrders.forEach(o => {
      const statusClean = o.status?.toLowerCase() || '';
      if (statusClean.includes('delivered') || statusClean.includes('completed')) {
        delivered++;
        totalDeliveryValue += o.amount;

        if (o.delivered && o.picked) {
          const diffMs = new Date(o.delivered) - new Date(o.picked);
          if (diffMs > 0) {
            totalDurationSec += Math.floor(diffMs / 1000);
            durationCount++;
          }
        }

        // Distance calculation
        let distance = 0;
        if (o.lat != null && o.lng != null && o.lat !== 0 && o.lng !== 0) {
          distance = getHaversineDistance(deptLat, deptLng, o.lat, o.lng) || 0;
        }
        totalDistance += distance;

      } else if (statusClean.includes('cancel')) {
        cancelled++;
      } else if (statusClean.includes('return')) {
        returned++;
      } else if (statusClean.includes('fail') || statusClean.includes('not available')) {
        failed++;
      } else {
        pending++;
      }
    });

    // Attendance days & hours
    let attQuery = `SELECT * FROM attendance WHERE employee_id = $1` + dateFilter.replace('created_at', 'date');
    const attRes = await pool.query(attQuery, filterParams);
    const workingDays = attRes.rowCount;
    let workingHours = 0;
    attRes.rows.forEach(a => {
      if (a.checkin_timestamp && a.checkout_timestamp) {
        const hours = (new Date(a.checkout_timestamp) - new Date(a.checkin_timestamp)) / (1000 * 60 * 60);
        if (hours > 0) workingHours += hours;
      } else if (a.checkin_timestamp) {
        workingHours += 8;
      }
    });
    if (workingHours === 0 && workingDays > 0) {
      workingHours = workingDays * 9;
    }

    const avgDeliveryTimeMin = durationCount > 0 ? Math.round((totalDurationSec / 60) / durationCount) : 0;
    const successRate = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
    const totalDistanceKM = parseFloat(totalDistance.toFixed(2));
    let ratingClean = 0.0;
    if (delivered > 0 || failed > 0 || cancelled > 0) {
      const ratingVal = 5.0 - (failed * 0.2) - (cancelled * 0.1);
      ratingClean = parseFloat(Math.min(5, Math.max(1, ratingVal)).toFixed(2));
    }

    res.json({
      success: true,
      data: {
        basicDetails: {
          employeeId: rider.id,
          name: rider.full_name,
          mobile: rider.mobile,
          email: rider.email,
          shift: `${rider.schedule_in || '09:00'} - ${rider.schedule_out || '18:00'}`,
          joiningDate: rider.created_at,
          supervisor: 'Super Admin'
        },
        performance: {
          ordersAssigned: assigned,
          ordersDelivered: delivered,
          ordersReturned: returned,
          ordersCancelled: cancelled,
          ordersPending: pending,
          failedDeliveryAttempts: failed,
          totalDeliveryValue: parseFloat(totalDeliveryValue.toFixed(2)),
          totalDistanceKM,
          workingDays,
          workingHours: parseFloat(workingHours.toFixed(1)),
          avgDeliveryTimeMin,
          successRate,
          rating: ratingClean
        }
      }
    });
  } catch (error) {
    console.error('Error fetching rider performance statistics:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
