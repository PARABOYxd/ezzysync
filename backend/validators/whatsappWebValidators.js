const { body } = require('express-validator');

/**
 * The AI toggles take a boolean, and it has to actually be there.
 *
 * Both handlers read `req.body.enabled` and pass it straight to the
 * repository, so a request with no body at all switched the feature *off*
 * rather than being rejected - `undefined` is falsy. That is not theoretical:
 * a bare POST to `/toggle-autopilot` during testing turned this account's
 * autopilot off, and nothing in the response said so, because
 * `Boolean(undefined)` is a perfectly good `false` to echo back.
 *
 * `isBoolean()` accepts the JSON literals plus the strings "true"/"false",
 * which is what a form-encoded client sends; `toBoolean()` then hands the
 * controller a real boolean either way.
 */
const toggleValidators = [
  body('enabled')
    .exists({ values: 'null' })
    .withMessage('Say whether this should be turned on or off.')
    .bail()
    .isBoolean()
    .withMessage('The on/off value must be true or false.')
    .toBoolean(),
];

module.exports = { toggleValidators };
