#!/usr/bin/env node
/**
 * Merges representative data into the GeoJSON district boundaries.
 * Run: node scripts/merge-reps.js
 */
const fs = require('fs');
const path = require('path');

const reps = [
  {district:1,rep_name:"Jeff Farnan",party:"R"},
  {district:2,rep_name:"Mazzie Christensen",party:"R"},
  {district:3,rep_name:"Danny Busick",party:"R"},
  {district:4,rep_name:"Greg Sharpe",party:"R"},
  {district:5,rep_name:"Louis Riggs",party:"R"},
  {district:6,rep_name:"Ed Lewis",party:"R"},
  {district:7,rep_name:"Peggy McGaugh",party:"R"},
  {district:8,rep_name:"Josh Hurlbert",party:"R"},
  {district:9,rep_name:"Dean VanSchoiack",party:"R"},
  {district:10,rep_name:"Bill Falkner",party:"R"},
  {district:11,rep_name:"Brenda Shields",party:"R"},
  {district:12,rep_name:"Mike Jones",party:"R"},
  {district:13,rep_name:"Sean Pouche",party:"R"},
  {district:14,rep_name:"Ashley Aune",party:"D"},
  {district:15,rep_name:"Kenneth Jamison",party:"D"},
  {district:16,rep_name:"Chris Brown",party:"R"},
  {district:17,rep_name:"Bill Allen",party:"R"},
  {district:18,rep_name:"Eric Woods",party:"D"},
  {district:19,rep_name:"Wick Thomas",party:"D"},
  {district:20,rep_name:"Mike Steinmeyer",party:"R"},
  {district:21,rep_name:"Will Jobe",party:"D"},
  {district:22,rep_name:"Yolanda Young",party:"D"},
  {district:23,rep_name:"Michael Johnson",party:"D"},
  {district:24,rep_name:"Emily Weber",party:"D"},
  {district:25,rep_name:"Patricia Mansur",party:"D"},
  {district:26,rep_name:"Tiffany Price",party:"D"},
  {district:27,rep_name:"Melissa Douglas",party:"D"},
  {district:28,rep_name:"Donna Barnes",party:"D"},
  {district:29,rep_name:"Aaron Crossley",party:"D"},
  {district:30,rep_name:"Jon Patterson",party:"R"},
  {district:31,rep_name:"Ron Fowler",party:"R"},
  {district:32,rep_name:"Jeff Coleman",party:"R"},
  {district:33,rep_name:"Carolyn Caton",party:"R"},
  {district:34,rep_name:"Kemp Strickler",party:"D"},
  {district:35,rep_name:"Keri Ingle",party:"D"},
  {district:36,rep_name:"Anthony Ealy",party:"D"},
  {district:37,rep_name:"Mark Sharp",party:"D"},
  {district:38,rep_name:"Martin Jacobs",party:"D"},
  {district:39,rep_name:"Mark Meirath",party:"R"},
  {district:40,rep_name:"Chad Perkins",party:"R"},
  {district:41,rep_name:"Doyle Justus",party:"R"},
  {district:42,rep_name:"Jeff Myers",party:"R"},
  {district:43,rep_name:"Kent Haden",party:"R"},
  {district:44,rep_name:"John Martin",party:"R"},
  {district:45,rep_name:"Kathy Steinhoff",party:"D"},
  {district:46,rep_name:"David T. Smith",party:"D"},
  {district:47,rep_name:"Adrian Plank",party:"D"},
  {district:48,rep_name:"Tim Taylor",party:"R"},
  {district:49,rep_name:"Jim Schulte",party:"R"},
  {district:50,rep_name:"Gregg Bush",party:"D"},
  {district:51,rep_name:"Mark Nolte",party:"R"},
  {district:52,rep_name:"Bradley Pollitt",party:"R"},
  {district:53,rep_name:"Terry Thompson",party:"R"},
  {district:54,rep_name:"Brandon Phelps",party:"R"},
  {district:55,rep_name:"William Irwin",party:"R"},
  {district:56,rep_name:"Michael Davis",party:"R"},
  {district:57,rep_name:"Rodger Reedy",party:"R"},
  {district:58,rep_name:"Willard Haley",party:"R"},
  {district:59,rep_name:"Rudy Veit",party:"R"},
  {district:60,rep_name:"Dave Griffith",party:"R"},
  {district:61,rep_name:"Bruce Sassmann",party:"R"},
  {district:62,rep_name:"Sherri Gallick",party:"R"},
  {district:63,rep_name:"Tricia Byrnes",party:"R"},
  {district:64,rep_name:"Deanna Self",party:"R"},
  {district:65,rep_name:"Wendy Hausman",party:"R"},
  {district:66,rep_name:"Marlene Terry",party:"D"},
  {district:67,rep_name:"Tonya Rush",party:"D"},
  {district:68,rep_name:"Kem Smith",party:"D"},
  {district:69,rep_name:"Scott Miller",party:"R"},
  {district:70,rep_name:"Stephanie Boykin",party:"D"},
  {district:71,rep_name:"LaDonna Appelbaum",party:"D"},
  {district:72,rep_name:"Doug Clemens",party:"D"},
  {district:73,rep_name:"Raychel Proudie",party:"D"},
  {district:74,rep_name:"Marla Smith",party:"D"},
  {district:75,rep_name:"Chanel Mosley",party:"D"},
  {district:76,rep_name:"Marlon Anderson",party:"D"},
  {district:77,rep_name:"Kimberly-Ann Collins",party:"D"},
  {district:78,rep_name:"Marty Joe Murray",party:"D"},
  {district:79,rep_name:"LaKeySha Bosley",party:"D"},
  {district:80,rep_name:"Elizabeth Fuchs",party:"D"},
  {district:81,rep_name:"Steve Butz",party:"D"},
  {district:82,rep_name:"Nick Kimble",party:"D"},
  {district:83,rep_name:"Raymond Reed",party:"D"},
  {district:84,rep_name:"Del Taylor",party:"D"},
  {district:85,rep_name:"Yolonda Fountain Henderson",party:"D"},
  {district:86,rep_name:"Jeff Hales",party:"D"},
  {district:87,rep_name:"Connie Steinmetz",party:"D"},
  {district:88,rep_name:"Holly Jones",party:"R"},
  {district:89,rep_name:"George Hruza",party:"R"},
  {district:90,rep_name:"Mark Boyko",party:"D"},
  {district:91,rep_name:"Jo Doll",party:"D"},
  {district:92,rep_name:"Michael Burton",party:"D"},
  {district:93,rep_name:"Bridget Walsh Moore",party:"D"},
  {district:94,rep_name:"Jim Murphy",party:"R"},
  {district:95,rep_name:null,party:null}, // Vacant
  {district:96,rep_name:"Brad Christ",party:"R"},
  {district:97,rep_name:"David Casteel",party:"R"},
  {district:98,rep_name:"Jaclyn Zimmermann",party:"D"},
  {district:99,rep_name:"Ian Mackey",party:"D"},
  {district:100,rep_name:"Philip Oehlerking",party:"R"},
  {district:101,rep_name:"Ben Keathley",party:"R"},
  {district:102,rep_name:"Richard West",party:"R"},
  {district:103,rep_name:"Dave Hinman",party:"R"},
  {district:104,rep_name:"Terri Violet",party:"R"},
  {district:105,rep_name:"Colin Wellenkamp",party:"R"},
  {district:106,rep_name:"Travis Wilson",party:"R"},
  {district:107,rep_name:"Mark Matthiesen",party:"R"},
  {district:108,rep_name:"Mike Costlow",party:"R"},
  {district:109,rep_name:"John Simmons",party:"R"},
  {district:110,rep_name:null,party:null}, // Vacant
  {district:111,rep_name:"Cecelie Williams",party:"R"},
  {district:112,rep_name:"Renee Reuter",party:"R"},
  {district:113,rep_name:"Phil Amato",party:"R"},
  {district:114,rep_name:null,party:null}, // Vacant
  {district:115,rep_name:"Bill Lucas",party:"R"},
  {district:116,rep_name:"Dale Wright",party:"R"},
  {district:117,rep_name:"Becky Laubinger",party:"R"},
  {district:118,rep_name:"Mike McGirl",party:"R"},
  {district:119,rep_name:"Brad Banderman",party:"R"},
  {district:120,rep_name:"John Hewkin",party:"R"},
  {district:121,rep_name:"Bill Hardwick",party:"R"},
  {district:122,rep_name:"Tara Peters",party:"R"},
  {district:123,rep_name:"Jeff Vernetti",party:"R"},
  {district:124,rep_name:"Don Mayhew",party:"R"},
  {district:125,rep_name:"Dane Diehl",party:"R"},
  {district:126,rep_name:"Jim Kalberloh",party:"R"},
  {district:127,rep_name:"Ann Kelley",party:"R"},
  {district:128,rep_name:"Christopher Warwick",party:"R"},
  {district:129,rep_name:"John Black",party:"R"},
  {district:130,rep_name:"Bishop Davidson",party:"R"},
  {district:131,rep_name:"Bill Owen",party:"R"},
  {district:132,rep_name:"Jeremy Dean",party:"D"},
  {district:133,rep_name:"Melanie Stinnett",party:"R"},
  {district:134,rep_name:"Alex Riley",party:"R"},
  {district:135,rep_name:"Betsy Fogle",party:"D"},
  {district:136,rep_name:"Stephanie Hein",party:"D"},
  {district:137,rep_name:"Darin Chappell",party:"R"},
  {district:138,rep_name:"Burt Whaley",party:"R"},
  {district:139,rep_name:"Bob Titus",party:"R"},
  {district:140,rep_name:"Jamie Ray Gragg",party:"R"},
  {district:141,rep_name:"Melissa Schmidt",party:"R"},
  {district:142,rep_name:"Jeff Knight",party:"R"},
  {district:143,rep_name:"Bennie Cook",party:"R"},
  {district:144,rep_name:"Tony Harbison",party:"R"},
  {district:145,rep_name:"Bryant Wolfin",party:"R"},
  {district:146,rep_name:"Barry Hovis",party:"R"},
  {district:147,rep_name:"John Voss",party:"R"},
  {district:148,rep_name:"David A. Dolan",party:"R"},
  {district:149,rep_name:null,party:null}, // Vacant
  {district:150,rep_name:"Cameron Bunting Parker",party:"R"},
  {district:151,rep_name:"Steven Jordan",party:"R"},
  {district:152,rep_name:"Hardy Billington",party:"R"},
  {district:153,rep_name:"Keith Elliott",party:"R"},
  {district:154,rep_name:"Lisa Durnell",party:"R"},
  {district:155,rep_name:"Matthew Overcast",party:"R"},
  {district:156,rep_name:"Brian Seitz",party:"R"},
  {district:157,rep_name:"Mitch Boggs",party:"R"},
  {district:158,rep_name:"Scott Cupps",party:"R"},
  {district:159,rep_name:"Dirk Deaton",party:"R"},
  {district:160,rep_name:null,party:null}, // Vacant
  {district:161,rep_name:"Lane Roberts",party:"R"},
  {district:162,rep_name:"Robert Bromley",party:"R"},
  {district:163,rep_name:"Cathy Loy",party:"R"},
];

// Generate email from name
function makeEmail(name) {
  if (!name) return null;
  // Handle special cases
  const clean = name
    .replace(/\./g, '')        // Remove periods (David T. Smith -> David T Smith)
    .replace(/-/g, '')         // Remove hyphens
    .replace(/\s+/g, ' ')     // Normalize spaces
    .trim();
  const parts = clean.split(' ');
  const first = parts[0].toLowerCase();
  const last = parts[parts.length - 1].toLowerCase();
  return `${first}.${last}@house.mo.gov`;
}

// Load GeoJSON
const geoPath = path.join(__dirname, '..', 'data', 'mo-house-districts.geojson');
const geo = JSON.parse(fs.readFileSync(geoPath, 'utf-8'));

// Build lookup by district number
const repMap = {};
for (const r of reps) {
  repMap[r.district] = r;
}

let matched = 0;
let unmatched = 0;

for (const feature of geo.features) {
  const distStr = feature.properties.SLDLST; // "001", "002", etc.
  const distNum = parseInt(distStr, 10);
  const rep = repMap[distNum];

  feature.properties.district = distNum;

  if (rep && rep.rep_name) {
    feature.properties.rep_name = rep.rep_name;
    feature.properties.party = rep.party;
    feature.properties.email = makeEmail(rep.rep_name);
    matched++;
  } else {
    feature.properties.rep_name = "Vacant";
    feature.properties.party = null;
    feature.properties.email = null;
    unmatched++;
  }

  // Clean up Census properties we don't need
  delete feature.properties.STATEFP;
  delete feature.properties.GEOID;
  delete feature.properties.GEOIDFQ;
  delete feature.properties.NAMELSAD;
  delete feature.properties.LSAD;
  delete feature.properties.LSY;
  delete feature.properties.MTFCC;
  delete feature.properties.FUNCSTAT;
  delete feature.properties.ALAND;
  delete feature.properties.AWATER;
  delete feature.properties.INTPTLAT;
  delete feature.properties.INTPTLON;
  delete feature.properties.SLDLST;
}

// Write merged GeoJSON
fs.writeFileSync(geoPath, JSON.stringify(geo));

console.log(`Merged: ${matched} districts matched, ${unmatched} vacant/unmatched`);
console.log(`Output: ${geoPath} (${(fs.statSync(geoPath).size / 1024).toFixed(0)}KB)`);
