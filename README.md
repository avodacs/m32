# M32 / X32 Controller

This package allows for programmatic control of the M32 / X32 audio console.

## Notes

* If a fader or mute button is touched while graduallySetAllFaderValues is running, it will stop.
* If graduallySetAllFaderValues is running and another one is started, the original one will stop.

## Example

```js
const M32Client = require('./src/M32Client');

const m32 = new M32Client('192.168.1.100');

m32.connect();              // Opens the connection to the M32
m32.startSubscription();    // Begins pulling live data from the M32

m32.setFaderValue(1, 0);    // Sets channel 1 to 0%
m32.setFaderValue(2, 0.5);  // Sets channel 2 to 50%
m32.setFaderValue(3, 1);    // Sets channel 3 to 100%

m32.graduallySetFaderValue(1, 1, 1000); // Fades channel 1 to 100% over 1000ms

m32.muteChannel(1);         // Mutes channel 1
m32.unmuteChannel(1);       // Unmutes channel 1

// Set multiple fader values instantly
m32.setAllFaderValues([
  {
    channel: 3,
    faderValue: 0.5,
    muted: true,
  },
  {
    channel: 4,
    faderValue: 0.6,
    muted: true,
  },
]);

// Set multiple fader values over 2000ms
m32.graduallySetAllFaderValues(
  [
    {
      channel: 5,
      faderValue: 0.5,
      muted: true,
    },
    {
      channel: 6,
      faderValue: 0.6,
      muted: true,
    },
  ],
  2000
);
```