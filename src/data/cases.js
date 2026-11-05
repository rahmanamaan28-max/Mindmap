export const cases = [
  {
    id: 'blacksite-001', title: 'The Missing Echo', chapter: 1,
    intro: 'At 23:47, the classified ECHO file vanished from BLACKSITE-09. Four people had access. The security footage was interrupted, and the access logs contradict one another.',
    publicFacts: ['Server access occurred at 23:41.', 'Security camera went offline at 23:43.', 'The file disappeared at 23:47.', 'No external entry was recorded.'],
    culpritCount: 1,
    culprit: 'technician',
    roles: [
      { id:'director', name:'Director', description:'You authorised a restricted access request shortly before the breach.', dossier:'You authorised a restricted access request at 23:39. The access record is genuine. You have privately promised the Researcher protection.', mission:{id:'protect-researcher', text:'Finish the case without the Researcher receiving the most votes.'}, ability:'REDACT: Once per match, conceal one non-critical detail when sharing a clue.' },
      { id:'security', name:'Security Officer', description:'You were responsible for the facility security timeline.', dossier:'You saw someone enter the server corridor at 23:42, but could not identify them. You also know one camera timestamp is two minutes out of sync.', mission:{id:'prove-tampering', text:'Correctly identify one manipulated record.'}, ability:'CROSS-CHECK: Once per match, ask the server whether two submitted claims conflict with verified facts.' },
      { id:'researcher', name:'Researcher', description:'You understand the ECHO file and its physical safeguards.', dossier:'The ECHO file can only be transferred using a physical security key. You lent your keycard to the Technician earlier that evening, but did not see what happened next.', mission:{id:'keep-key-secret', text:'Do not publicly reveal who borrowed your keycard.'}, ability:'FORENSICS: Once per match, reveal an extra detail about one public clue.' },
      { id:'technician', name:'Technician', description:'You maintained the facility systems and access controls.', dossier:'You manually triggered the camera outage at 23:43 and used the borrowed physical security key to transfer ECHO. You are responsible for the theft. Do not confess unless it helps your agenda.', mission:{id:'avoid-proof', text:'Avoid having two verified clues directly identify you.'}, ability:'GHOST TRACE: Once per match, learn whether one access record is authentic.' }
    ],
    clues: [
      {id:'E1', title:'Access register', text:'A valid restricted-access request was approved at 23:39.', status:'verified', detail:'The request was authorised by the Director.'},
      {id:'E2', title:'Corridor witness note', text:'An unidentified person entered the server corridor at 23:42.', status:'unverified', detail:'The witness could not identify the person.'},
      {id:'E3', title:'Transfer requirement', text:'ECHO requires a physical security key for transfer.', status:'verified', detail:'A keycard loan was recorded earlier that evening.'},
      {id:'E4', title:'Camera outage log', text:'The camera system was manually interrupted at 23:43.', status:'verified', detail:'The interruption was initiated from the maintenance console assigned to the Technician.'}
    ],
    twist: {title:'LEAKED MAINTENANCE NOTE', text:'A maintenance note confirms that the camera outage was initiated locally, not by an external attacker.'},
    timeline: ['23:39 — Director authorises restricted access.', '23:41 — Server access recorded.', '23:42 — An unidentified person enters the corridor.', '23:43 — Technician manually disables the camera.', '23:47 — ECHO is transferred using a physical key.']
  }
];
