import STAGE_TABLES from './crypto-stage-tables.js';
const XOR_KEYS = {
    x: [
        123, 241, 173, 125, 241, 67, 78, 249, 240, 236, 176, 81, 139, 16, 3, 250,
        33, 162, 198, 58, 147, 171, 217, 8, 103, 89, 180, 30, 63, 172, 233, 246,
    ],
    dollar: [
        65, 125, 44, 45, 168, 78, 7, 37, 139, 113, 97, 167, 191, 169, 125, 242, 244,
        46, 117, 106, 157, 68, 141, 195, 57, 112, 93, 138, 223, 91, 196, 33,
    ],
    f: [
        44, 191, 123, 115, 10, 3, 160, 110, 92, 195, 196, 38, 132, 143, 138, 73,
        108, 223, 91, 239, 21, 122, 18, 33, 250, 41, 211, 198, 117, 73, 218, 155,
    ],
    ba: [
        200, 76, 187, 192, 23, 193, 115, 232, 44, 96, 248, 144, 47, 254, 3, 125,
        221, 41, 32, 22, 69, 204, 204, 43, 182, 84, 80, 27, 3, 23, 203, 116,
    ],
    ua: [
        191, 177, 8, 166, 36, 16, 141, 221, 129, 26, 226, 115, 49, 176, 64, 210,
        163, 214, 13, 36, 190, 193, 50, 81, 67, 187, 134, 205, 158, 171, 36, 171,
    ],
};
const RC4_KEY_SOURCES = {
    dollarA: "13YDu67uDgFczo3DnuTIURqas4lfMEPADY6Jaeqky+w=",
    oa: "U9LRYFL2zXU4TtALIYDj+lCATRk/EJtH7/y7qYYNlh8=",
    J: "RougjiFHkSKs20DZ6BWXiWwQUGZXtseZIyQWKz5eG34=",
    P: "vZ23RT7pbSlxwiygkHd1dhToIku8SNHPC6V36L4cnwM=",
    ha: "BkWI8feqSlDZKMq6awfzWlUypl88nz65KVRmpH0RWIc=",
};
const STAGE_SPECS = {
    V: {
        prefix: 12,
        key: "x",
        tables: STAGE_TABLES.V,
    },
    l: {
        prefix: 16,
        key: "f",
        tables: STAGE_TABLES.l,
    },
    t: {
        prefix: 14,
        key: "ua",
        tables: STAGE_TABLES.t,
    },
    ea: {
        prefix: 12,
        key: "dollar",
        tables: STAGE_TABLES.ea,
    },
    Y: {
        prefix: 14,
        key: "ba",
        tables: STAGE_TABLES.Y,
    },
};
const DECODE_CHAIN = [
    { stage: "V", rc4Key: "oa" },
    { stage: "l", rc4Key: "J" },
    { stage: "t", rc4Key: "ha" },
    { stage: "ea", rc4Key: "P" },
    { stage: "Y", rc4Key: "dollarA" },
];
const SELF_TEST_TOKEN = "xQm9tJfLwGhz_0Eq8S_YAHYkwp-qUvLfm50W5bxnyd1AnCopCzWCyD5QzoOLDq15Ny1z45gey0uqjCSuOKCj4aZ1L8EuF8msUtrI4-farOELb5CJuax7";
const SELF_TEST_OUTPUT = "https://megaup.nl/e/test?autostart=true";
export { DECODE_CHAIN, RC4_KEY_SOURCES, SELF_TEST_OUTPUT, SELF_TEST_TOKEN, STAGE_SPECS, XOR_KEYS, };
