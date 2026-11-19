function logAudit(user, action, bookingId, details) {
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  auditLogSheet.appendRow([timestamp, user, action, bookingId || '', details || '']);
}
