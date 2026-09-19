/**
 * Anvi Mitra ERP: Transport & Vehicles Module
 */

const { authenticate, requireRoles } = require('./security');

function registerTransportRoutes(app, pool) {
  app.get('/api/transport/vehicles', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.json({ vehicles: [] });
      const { rows } = await pool.query(
        'SELECT * FROM transport_vehicles WHERE ($1::uuid IS NULL OR school_id = $1::uuid) ORDER BY vehicle_number ASC',
        [req.auth.schoolId]
      );
      res.json({ vehicles: rows });
    } catch (err) { next(err); }
  });

  app.post('/api/transport/vehicles', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      const { vehicleNumber, capacity = 30, driverName, driverPhone } = req.body || {};
      if (!vehicleNumber) return res.status(400).json({ error: 'vehicleNumber is required' });

      if (!pool) return res.status(201).json({ vehicle: { id: 'mock-veh-id', vehicleNumber } });

      const { rows } = await pool.query(
        `INSERT INTO transport_vehicles (school_id, vehicle_number, capacity, driver_name, driver_phone)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.auth.schoolId, vehicleNumber.trim().toUpperCase(), capacity, driverName, driverPhone]
      );
      res.status(201).json({ vehicle: rows[0] });
    } catch (err) { next(err); }
  });
}

module.exports = { registerTransportRoutes };
