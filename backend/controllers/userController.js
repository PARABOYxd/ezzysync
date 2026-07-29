const userService = require('../services/userService');
const auditService = require('../services/auditService');

async function list(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Administrator role required.' });
    }
    const users = await userService.listUsersByTenant(req.user.tenantId);
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Administrator role required.' });
    }
    const { email, password, name, role, permissions } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    const user = await userService.createTeamMember(req.user.tenantId, {
      email,
      password,
      name,
      role,
      permissions,
    });
    
    // Log audit trail
    await auditService.logAction(req, 'CREATE_TEAM_MEMBER', { memberId: user.userId, memberEmail: user.email, role });
    
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Administrator role required.' });
    }
    const { id } = req.params;
    const { name, role, permissions, password } = req.body;
    const user = await userService.updateTeamMember(req.user.tenantId, id, {
      name,
      role,
      permissions,
      password,
    });
    
    // Log audit trail (excluding passwords for safety)
    const updates = Object.keys(req.body).filter((key) => key !== 'password');
    await auditService.logAction(req, 'UPDATE_TEAM_MEMBER', { memberId: id, updates });
    
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Administrator role required.' });
    }
    const { id } = req.params;
    if (id === req.user.userId) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }
    await userService.deleteTeamMember(req.user.tenantId, id);
    
    // Log audit trail
    await auditService.logAction(req, 'DELETE_TEAM_MEMBER', { memberId: id });
    
    res.json({ message: 'Team member account deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
