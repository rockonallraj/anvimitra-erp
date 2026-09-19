/**
 * Anvi Mitra ERP: Transport Routes & Stops Module
 */

const { authenticate, requireRoles } = require('./security');

function registerTransportRouteRoutes(app, pool) {
  app.get('/api/transport/routes', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.json({ routes: [] });
      const { rows } = await pool.query(
        `SELECT r.*, v.vehicle_number as "vehicleNumber"
         FROM transport_routes r
         LEFT JOIN transport_vehicles v ON v.id = r.vehicle_id
         WHERE ($1::uuid IS NULL OR r.school_id = $1::uuid)
         ORDER BY r.route_name ASC`,
        [req.auth.schoolId]
      );
      res.json({ routes: rows });
    } catch (err) { next(err); }
  });

  app.post('/api/transport/routes', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      const { routeName, vehicleId = null, startPoint, endPoint, monthlyFee = 0 } = req.body || {};
      if (!routeName) return res.status(400).json({ error: 'routeName is required' });

      if (!pool) return res.status(201).json({ route: { id: 'mock-route-id', routeName } });

      const { rows } = await pool.query(
        `INSERT INTO transport_routes (school_id, route_name, vehicle_id, start_point, end_point, monthly_fee)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [req.auth.schoolId, routeName.trim(), vehicleId, startPoint, endPoint, monthlyFee]
      );
      res.status(201).json({ route: rows[0] });
    } catch (err) { next(err); }
  });
}

module.exports = { registerTransportRouteRoutes };
