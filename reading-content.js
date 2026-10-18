export const email = {
  from: "lannguyen146@gmail.com",
  to: "hoamaitran@gmail.com",
  subject: "Greetings, from the mountains of Sơn La!",
  paragraphs: [
    "Hi Mai,",
    "How are you doing? I’m doing good! Living in a peaceful little village in Sơn La, right here in the north-west of Viet Nam makes me really happy. My house is surrounded by green tea hills and high mountains, and the morning air here is always fresh and cool.",
    "My family lives in a traditional wooden stilt house. It is built high off the ground to keep us cool and safe. Inside, there is a big living room where we spend most of our time. A low wooden table sits right in the middle, with a cozy sofa next to it and a little lamp on top. My bedroom is right behind the living room, and my bed is placed next to the window so I can feel the morning breeze. The kitchen is at the back, smelling faintly of wood smoke, and the bathroom is just a few steps away. Outside, we have a lovely little garden full of blooming flowers right in front of the porch.",
    "Life here is simple and wonderful. For meals, we often have sticky rice wrapped in leaves and freshly grilled fish seasoned with local mountain herbs. On special community days, you should see the women in my village – they look so graceful in their traditional tight-fitting com blouses, long black skirts, and colorful Pieu scarves embroidered by hand. Whenever there's a celebration, we all join hands to dance the lively Xòe circle together around the fire.",
    "What about the lifestyle from your hometown? I’d love to hear about where you live, too!",
    "Love,",
    "Lan",
  ],
};
export const huntQuestions = [
  {
    prompt: "Where does Lan live?",
    choices: ["In a village in Sơn La, near tea hills and mountains.", "In a busy city near the sea.", "On an island with many beaches."],
    answer: 0,
    correct: "Excellent! You have found the first clue. Look at the sentence: “Living in a peaceful little village in Sơn La, right here in the north-west of Viet Nam makes me really happy.”",
    incorrect: "Not quite! Look for the words that tell you where Lan lives. Read the first paragraph again and try once more.",
    action: "See the first clue!",
  },
  {
    prompt: "What kind of home does Lan's family live in?",
    choices: ["A modern apartment in a tall building.", "A traditional wooden stilt house built high off the ground.", "A small brick house near the beach."],
    answer: 1,
    correct: "Well done! You found the second clue! The email says: “My family lives in a traditional wooden stilt house. It is built high off the ground to keep us cool and safe.”",
    incorrect: "Keep exploring! Read the second paragraph again and find the sentence describing Lan’s house.",
    action: "See the second clue!",
  },
  {
    prompt: "What special food does Lan mention for their meals?",
    choices: ["Bread with cheese and butter.", "Sticky rice wrapped in leaves and grilled fish with local herbs.", "Pizza and potato chips."],
    answer: 1,
    correct: "Great detective work! Look at the sentence: “For meals, we often have sticky rice wrapped in leaves and freshly grilled fish seasoned with local mountain herbs.”",
    incorrect: "Not yet! Read the third paragraph again. What traditional food does Lan’s family eat?",
    action: "See the third clue!",
  },
  {
    prompt: "What do women in Lan's village wear on special community days?",
    choices: ["School uniforms and sports shoes.", "Tight-fitting com blouses, long black skirts, and colorful Pieu scarves.", "Long dresses and sun hats."],
    answer: 1,
    correct: "Fantastic! You have all four clues! The email mentions: “...tight-fitting com blouses, long black skirts, and colorful Pieu scarves...” and the lively Xòe dance. You are ready for the final mystery!",
    incorrect: "Almost there! Look at the third paragraph again. Pay attention to the special names of the clothes.",
    action: "See the final clue!",
  },
];
export const clues = [
  { title: "The Landscape", icon: "landscape", keywords: "Sơn La · Highlands · Tea hills", description: "Lan lives in a village in the mountainous north-west of Viet Nam." },
  { title: "The Home", icon: "house", keywords: "Stilt house · Wooden house", description: "Lan's family lives in a traditional wooden stilt house built high off the ground." },
  { title: "The Food", icon: "food", keywords: "Sticky rice · Grilled fish · Mountain herbs", description: "Lan shares traditional meals with sticky rice and mountain-herb grilled fish." },
  { title: "The Culture", icon: "culture", keywords: "Com blouse · Pieu scarf · Xòe dance", description: "Women wear traditional com blouses and Pieu scarves, and everyone dances the Xòe circle." },
];
export const mystery = {
  prompt: "Can you guess Lan's ethnic group?",
  choices: ["The Thai ethnic group.", "The Kinh ethnic group.", "The Khmer ethnic group."],
  answer: 0,
  incorrect: "Not quite! A good explorer checks the evidence before making a decision. Review your clues and try again!",
};
export const journal = {
  paragraphs: [
    "Hi! I'm Minh. I live with my family in a small house in the countryside. There is a living room in the middle of our house. A sofa is next to the window, and a lamp is on the table. My bedroom is next to the living room. My bed is near the window. The kitchen is behind the living room, and the bathroom is next to the kitchen. There is a small garden in front of our house, with many flowers.",
    "From my bedroom window, I can see green tea hills and high mountains. I live in a cool highland in north-west Viet Nam. In spring, many plum trees have beautiful white flowers. I love the fresh air and the beautiful countryside!",
  ],
  words: [["Countryside", "Vùng nông thôn"], ["Tea hills", "Đồi chè"], ["Highland", "Vùng cao nguyên"], ["Plum trees", "Cây mận"], ["Flowers", "Hoa"]],
};
export const homeQuestions = [
  { title: "Inside Minh’s House", prompt: "Where is Minh’s bed?", choices: ["Near the window.", "In the kitchen.", "In the garden."], answer: 0 },
  { title: "Follow the Landscape", prompt: "What can Minh see from his bedroom window?", choices: ["Green tea hills and high mountains.", "Tall buildings and busy roads.", "The blue sea and many boats."], answer: 0 },
  { title: "Discover the Spring Flowers", prompt: "What can people see in Minh’s area in spring?", choices: ["Beautiful white flowers on plum trees.", "Snow-covered streets and ice.", "Coconut trees beside the sea."], answer: 0 },
];
export const hometown = {
  prompt: "From what we have read, where does Minh live?",
  choices: ["In Hanoi.", "In Mộc Châu.", "In Ha Long Bay."],
  answer: 1,
  incorrect: "Not quite! Think about the tea hills, the highland landscape and the white plum blossoms. Which matches all three clues?",
  correct: "Congratulations! You have found Minh’s home! Mộc Châu is a beautiful highland area in Sơn La, north-west Viet Nam. It is known for its green tea hills, fresh air and beautiful flowers. In spring, white plum blossoms make the landscape especially beautiful.",
};
export const practiceQuestions = [
  { before: "The kitchen is at the", after: "of the house, and the bathroom is near it.", choices: ["back", "middle", "front"], answer: "back", explanation: "In traditional houses, service rooms like the kitchen and bathroom are usually placed together in the quiet area at the back of the house, away from the front door!" },
  { before: "We live in the countryside, the morning air is always fresh and", after: ".", choices: ["cool", "busy", "hot"], answer: "cool", explanation: 'Look at context words! The air cannot be "busy" (only people/roads are busy!), and morning nature air is refreshing, not burning "hot"!' },
  { before: "A wooden table is in the centre of the living room, and a cozy", after: "is next to it.", choices: ["sofa", "bed", "lamp"], answer: "sofa", explanation: "Match furniture to the room! A bed goes in the bedroom. A lamp gives light, but a sofa is soft and \"cozy\" to sit on in the living room." },
];
