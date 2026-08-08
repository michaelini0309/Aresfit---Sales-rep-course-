(function(){
  'use strict';

  function parseTopLevelObjects(body){
    const items=[];
    let i=0;
    while(i<body.length){
      while(i<body.length&&/[\s,]/.test(body[i])) i++;
      if(i>=body.length) break;
      if(body[i]!=='{') throw new Error('Course data structure is invalid.');
      const start=i;
      let depth=0,inString=false,escaped=false;
      for(;i<body.length;i++){
        const ch=body[i];
        if(inString){
          if(escaped) escaped=false;
          else if(ch==='\\') escaped=true;
          else if(ch==='"') inString=false;
        }else{
          if(ch==='"') inString=true;
          else if(ch==='{'||ch==='[') depth++;
          else if(ch==='}'||ch===']'){
            depth--;
            if(depth===0){
              i++;
              items.push(body.slice(start,i));
              break;
            }
          }
        }
      }
    }
    return items;
  }

  function q(category,weight,critical,scenario,prompt,options,answer,explain){
    return {category,weight,critical,scenario,prompt,options,answer,explain};
  }

  window.applyAresFitCourseV76=function(rawHtml){
    let html=rawHtml;

    html=html.replace("try{adminUnlocked=localStorage.getItem(ADMIN_KEY)==='1';}catch(e){}","try{localStorage.removeItem(ADMIN_KEY)}catch(e){}");
    html=html.replace("try{localStorage.setItem(ADMIN_KEY,adminUnlocked?'1':'0')}catch(e){}","try{localStorage.removeItem(ADMIN_KEY)}catch(e){}");

    const moduleStartMarker='const modules=[';
    const moduleEndMarker='];\nconst assessmentQuestions=';
    const moduleStart=html.indexOf(moduleStartMarker);
    const moduleEnd=html.indexOf(moduleEndMarker,moduleStart);
    if(moduleStart<0||moduleEnd<0) throw new Error('Could not locate course modules.');
    const bodyStart=moduleStart+moduleStartMarker.length;
    const moduleItems=parseTopLevelObjects(html.slice(bodyStart,moduleEnd));
    const modules=moduleItems.map((item,index)=>{
      try{return JSON.parse(item)}catch(error){throw new Error(`Could not parse module ${index+1}: ${error.message}`)}
    });

    const getModule=id=>{
      const found=modules.find(module=>module.id===id);
      if(!found) throw new Error(`Required module missing: ${id}`);
      return found;
    };
    const getStep=(module,title)=>module.steps.find(step=>step.title===title);
    const removeSteps=(module,titles)=>{module.steps=module.steps.filter(step=>!titles.includes(step.title));};
    const flattenTap=(module,title,newTitle)=>{
      const idx=module.steps.findIndex(step=>step.type==='tap'&&step.title===title);
      if(idx<0) return;
      const old=module.steps[idx];
      module.steps[idx]={type:'brief',title:newTitle||title,html:`<h2>${newTitle||title}</h2><ul class="compact-list">${(old.cards||[]).map(card=>`<li><strong>${card.front}:</strong> ${card.back}</li>`).join('')}</ul>`};
    };

    const businessIndex=modules.findIndex(module=>module.id==='aresfit_business');
    if(businessIndex>0) modules.unshift(modules.splice(businessIndex,1)[0]);
    const ownershipIndex=modules.findIndex(module=>module.id==='ownership');
    if(ownershipIndex!==1&&ownershipIndex>=0) modules.splice(1,0,modules.splice(ownershipIndex,1)[0]);

    const business=getModule('aresfit_business');
    const flow=getStep(business,'The commercial order flow');
    if(flow){
      flow.html=`<h2>A capable rep should move a normal sale forward without unnecessary hand-offs</h2>
      <ol class="compact-list">
        <li><strong>Understand the requirement:</strong> buyer, intended use, quantity, budget, timing, decision process and site.</li>
        <li><strong>Recognise the product route:</strong> use your range knowledge to identify the sensible family or exact product while you are still speaking to the customer.</li>
        <li><strong>Quote when the choice is clear:</strong> if the customer has named the exact item, or you are confident the recommended option genuinely fits, use the approved quote process you have been trained on.</li>
        <li><strong>Confirm restricted facts:</strong> do not invent stock, exact lead time, delivery or installation cost, unauthorised discount, finance approval or exact warranty wording.</li>
        <li><strong>Keep control:</strong> return to the buyer with the quote or confirmed information and continue the opportunity yourself.</li>
      </ol>
      <div class="callout good"><strong>The goal is good judgement, not constant escalation.</strong><p>Michael is the first internal point of contact when a fact genuinely needs checking or authority. Sandde should receive a complete case, not an unfinished customer conversation.</p></div>`;
    }
    flattenTap(business,'AresFit operating rules','AresFit operating rules');

    const ownership=getModule('ownership');
    ownership.summary='Own the sale, use product knowledge to solve normal customer questions and escalate only genuine confirmations or authority decisions.';
    const support=getStep(ownership,'Use support without losing control');
    if(support){
      support.html=`<h2>Know what you should answer yourself and what must be confirmed</h2>
      <p class="short-copy">A rep should not make the customer wait for an internal answer when the question is ordinary product knowledge. Learn the ranges well enough to make sensible recommendations in real time.</p>
      <div class="two-col">
        <div class="mini-card"><h3>Rep owns</h3><p>Discovery, product-family recognition, normal product comparisons, quantities, customer priorities, initial recommendation, quote preparation when the choice is clear, follow-up and objection handling.</p></div>
        <div class="mini-card"><h3>Confirm internally</h3><p>Stock, exact lead time, delivery or installation pricing, discounts outside authority, exact warranty wording, finance approval/terms and unusual supplier or technical facts.</p></div>
      </div>
      <div class="callout good"><strong>Michael is first internal contact.</strong><p>Bring a clear question with the customer requirement already worked out. Michael should be checking or approving the missing point, not rebuilding the whole sale from scratch.</p></div>
      <div class="callout warn"><strong>Customer-facing rule</strong><p>If something genuinely needs confirmation, say you will confirm it and return with the answer. Do not repeatedly tell the customer that every normal question has to go through Michael.</p></div>`;
    }
    const productHelp=getStep(ownership,'When you need product help');
    if(productHelp){
      Object.assign(productHelp,{type:'choice',title:'When should a product decision come back internally?',scenario:'A gym wants six selectorised strength stations. You have confirmed the movements, user type, footprint, loading style, budget and commercial environment, and the approved range guide gives you a clear product route.',prompt:'What should the rep do?',options:[
        {text:'Send the whole requirement to Michael and ask him to select every machine.',correct:false,feedback:'Normal product selection should increasingly be handled by the rep.'},
        {text:'Recommend the suitable range or products, explain why they fit, prepare the quote if you are confident in the choice, and ask internally only for any genuinely unconfirmed supplier, delivery or approval point.',correct:true,feedback:'Correct. Product knowledge should reduce unnecessary hand-offs.'},
        {text:'Choose the highest-priced option because that is safest.',correct:false,feedback:'Price is not a substitute for product fit.'}
      ]});
    }

    const gatekeepers=getModule('gatekeepers');
    gatekeepers.steps.push(
      {type:'choice',title:'Gatekeeper: “We already have equipment”',scenario:'Reception says, “We already have all our gym equipment, thanks.” You have not spoken with the equipment decision-maker.',prompt:'What is the best response?',options:[
        {text:'Treat that as a rejection and mark the business uninterested.',correct:false,feedback:'A gym having equipment is expected and says nothing about future replacement or purchasing.'},
        {text:'Acknowledge it and clarify that you are asking who handles future replacements, additions or refurbishments, then ask for the correct person or best time to reach them.',correct:true,feedback:'Correct. Reframe the purpose without arguing with reception.'},
        {text:'Tell reception their equipment is probably old and needs replacing.',correct:false,feedback:'That is an unsupported claim.'},
        {text:'Ask reception to list every machine they already own.',correct:false,feedback:'That is not the gatekeeper’s job and does not move you towards the buyer.'}
      ]},
      {type:'choice',title:'Gatekeeper: “We already have a supplier”',scenario:'Reception says, “We already use a supplier, so the manager will not need this.” There has been no direct conversation with the buyer.',prompt:'What should the rep do?',options:[
        {text:'Explain briefly that existing suppliers are normal and ask who handles future replacements, alternative brands or overflow purchases.',correct:true,feedback:'Correct. An existing supplier is information, not automatic disqualification.'},
        {text:'Promise AresFit will beat the existing supplier on price if they transfer you.',correct:false,feedback:'There is no basis or authority for that promise.'},
        {text:'Ask reception to cancel the current supplier first.',correct:false,feedback:'That is unrealistic and confrontational.'},
        {text:'Mark the lead dead because supplier loyalty never changes.',correct:false,feedback:'A second-supplier or future opening may still exist.'}
      ]},
      {type:'choice',title:'Gatekeeper: “They are not interested”',scenario:'A receptionist says, “The owner is not interested.” They do not say the owner personally made that decision today and there is no do-not-contact request.',prompt:'How should the rep treat that?',options:[
        {text:'Ask one calm routing question to establish whether that is the owner’s actual decision or the gatekeeper’s assumption, and if appropriate ask when the equipment buyer is available.',correct:true,feedback:'Correct. A gatekeeper opinion is not automatically a decision-maker rejection.'},
        {text:'Record a confirmed decision-maker rejection immediately.',correct:false,feedback:'You have not established that the decision-maker made the decision.'},
        {text:'Argue until reception transfers the call.',correct:false,feedback:'Professional routing is the objective, not a fight with the gatekeeper.'},
        {text:'Call every hour until somebody different answers.',correct:false,feedback:'That is excessive and poor contact control.'}
      ]},
      {type:'choice',title:'Gatekeeper: “Just send an email”',scenario:'Reception says, “Just email something over.” You still do not know the equipment decision-maker or whether anything is planned.',prompt:'What gives that email route value?',options:[
        {text:'Send the full catalogue to the general inbox and wait.',correct:false,feedback:'That gives you no owner, purpose or next action.'},
        {text:'Confirm the decision-maker’s name and correct email, ask one useful planning question if appropriate, and establish when a sensible follow-up would be.',correct:true,feedback:'Correct. The email is now attached to a person, purpose and follow-up.'},
        {text:'Refuse to email unless they transfer the call immediately.',correct:false,feedback:'Email can still be useful when it is qualified.'},
        {text:'Ask reception to choose the equipment first.',correct:false,feedback:'Reception is not the product buyer.'}
      ]}
    );

    const solution=getModule('solution');
    solution.steps.splice(1,0,
      {type:'brief',title:'Do not over-question when the answer is already clear',html:`<h2>The skill is recognising when the customer has already given you enough</h2>
      <p class="short-copy">Discovery is not a checklist competition. Ask enough to make a good recommendation, then make it. If a buyer describes a standard requirement that clearly points to a range you know, say so on the call instead of automatically saying you will find out.</p>
      <div class="scenario"><div class="scenario-label">Example</div><p>Customer: “We need proper commercial treadmills for a busy gym. They need to last, have a decent-sized running area and be good everyday club machines.”</p></div>
      <div class="callout good"><strong>Strong rep judgement:</strong><p>“The Star Trac 8 Series is the obvious place I’d start for that. It is the full-commercial club range. Let me narrow the exact 8 Series option and console around your budget and how the treadmills will be used.”</p></div>
      <p>You still confirm the details that could change the exact model, but you do not pretend you know nothing when the product route is already obvious.</p>`},
      {type:'brief',title:'Questions that reveal the product indirectly',html:`<h2>Ask about the problem, not just the model name</h2>
      <ul class="compact-list">
        <li><strong>Who is using it?</strong> General members, serious lifters, performance athletes, older users, rehabilitation users or class participants.</li>
        <li><strong>How hard will it be used?</strong> Quiet hotel gym, normal commercial club, 24/7 high traffic or performance facility.</li>
        <li><strong>What are they trying to improve?</strong> Reliability, space, queueing, member experience, accessibility, performance or matching an existing line.</li>
        <li><strong>What do they have now?</strong> Brand/range, what they like, what they dislike and whether they want a similar feel.</li>
        <li><strong>What type of training?</strong> Selectorised, plate-loaded, free weights, cardio, studio cycling, functional or rehabilitation-style movement.</li>
        <li><strong>What physical limits matter?</strong> Floor area, ceiling, power, doorways, racks/anchoring and route into the final position.</li>
        <li><strong>What commercial limits matter?</strong> Quantity, budget, deadline and whether the priority is premium experience, value or maximum durability.</li>
      </ul>
      <div class="callout good"><strong>Think:</strong><p>customer answer → requirement → range → exact product.</p></div>`},
      {type:'choice',title:'Recognising the range from the customer’s language',scenario:'A 24/7 independent gym says its current strength area gets queues at peak times. Members include beginners and experienced lifters. The owner wants a polished selectorised circuit that feels premium and is easy for members to adjust.',prompt:'What is the best direction?',options:[
        {text:'Treat the description as too vague and say you will ask Michael which brand to use.',correct:false,feedback:'The requirement already points towards a premium commercial selectorised route.'},
        {text:'Start with Nautilus Inspiration, then confirm the exact movements, quantities and footprint before quoting the circuit.',correct:true,feedback:'Correct. Inspiration is the premium selectorised starting point; exact products still depend on the circuit.'},
        {text:'Use Nautilus Leverage because all premium strength equipment is plate-loaded.',correct:false,feedback:'Leverage is plate-loaded, which is not what the customer asked for.'},
        {text:'Use Instinct automatically because it takes less space.',correct:false,feedback:'Instinct is the compact/light-commercial line and should not be the default for a busy dues-paying gym.'}
      ]}
    );

    const cardio=getModule('equipment_cardio');
    cardio.steps.push(
      {type:'brief',title:'Star Trac range shortcuts',html:`<h2>Know the simple difference between the main treadmill routes</h2>
      <div class="two-col">
        <div class="mini-card"><h3>4 Series</h3><p>Space-conscious light-commercial route for hospitality, multi-housing and lighter-use facilities. Do not default to it for a normal high-traffic dues-paying gym.</p></div>
        <div class="mini-card"><h3>6 Series</h3><p>Middle commercial tier. A useful value route when the customer needs proper daily commercial performance but does not need the top member-experience/performance specification.</p></div>
        <div class="mini-card"><h3>8 Series</h3><p>The default full-commercial club route when the buyer wants durability, a proper-sized treadmill and strong everyday member experience. 8TR is the value-minded full-commercial starting point; 8TRx adds a more performance-focused design and controls.</p></div>
        <div class="mini-card"><h3>10TRx FreeRunner</h3><p>Premium performance-running route with HexDeck technology. Think serious running, premium facility or performance-led experience rather than a basic everyday treadmill need.</p></div>
      </div>
      <div class="callout good"><strong>Fast judgement example</strong><p>“Busy commercial gym, long-lasting, decent size, good everyday treadmill” → start at <strong>8 Series</strong>. “Hotel/residential fitness room with lighter use” → consider <strong>4 Series</strong>. “Performance runners / premium running experience” → consider <strong>10TRx</strong>.</p></div>`},
      {type:'choice',title:'Treadmill range judgement',scenario:'A gym owner says, “I am not chasing fancy performance technology. I want proper commercial treadmills that will take daily gym use, feel substantial and last.”',prompt:'Which range is the strongest starting point?',options:[
        {text:'Star Trac 4 Series because it is the compact range.',correct:false,feedback:'4 Series is aimed at lighter-use hospitality/multi-housing environments.'},
        {text:'Star Trac 8 Series, then narrow 8TR versus 8TRx and console around the exact priorities and budget.',correct:true,feedback:'Correct. This is the normal full-commercial club route.'},
        {text:'10TRx FreeRunner because the top-priced range is always safest.',correct:false,feedback:'The buyer did not describe a performance-running requirement.'},
        {text:'Any series is equally suitable if the customer signs the quote.',correct:false,feedback:'Product duty level and use case still matter.'}
      ]},
      {type:'brief',title:'Commercial suitability before warranty detail',html:`<h2>Learn the duty level first; verify exact warranty numbers when needed</h2>
      <p class="short-copy">The current Core warranty matrix separates full-commercial equipment from light-commercial/non-commercial routes. For the main cardio families, the important first judgement is suitability.</p>
      <ul class="compact-list">
        <li><strong>Commercial starting routes:</strong> Star Trac 6 and 8 Series treadmills and cardio; Star Trac S-TRC; Star Trac S-Series cross trainer/upright/recumbent; Star Trac 10TRx; StairMaster 10G and the commercial StairMaster families shown in the matrix.</li>
        <li><strong>Do not treat as normal full-commercial club routes:</strong> Star Trac 4 Series, Star Trac S-TRX and StairMaster Jacobs Ladder 2 are marked not intended for commercial use in the commercial column.</li>
      </ul>
      <div class="callout warn"><strong>Exact warranty terms are still checked from the current matrix.</strong><p>Reps should know whether the product belongs in a normal commercial gym; they do not need every component warranty memorised.</p></div>`}
    );

    const strength=getModule('equipment_strength');
    strength.steps.push(
      {type:'brief',title:'Nautilus range shortcuts',html:`<h2>Know what each strength line is trying to be</h2>
      <div class="two-col">
        <div class="mini-card"><h3>Inspiration</h3><p>Premium full-commercial selectorised circuit. Modern uniform look, refined member experience, Lock N Load, assisted adjustments and strong presentation. Start here when the buyer wants a high-end selectorised floor.</p></div>
        <div class="mini-card"><h3>Impact</h3><p>Proven full-commercial selectorised line with strong biomechanics and straightforward commercial usability. Think dependable commercial circuit and value before premium presentation.</p></div>
        <div class="mini-card"><h3>Instinct</h3><p>Simple, compact, easy-to-use single and dual-function circuit line. Useful where space and simplicity matter, but the Core warranty matrix marks Instinct as light commercial, so it is not the default for a busy dues-paying gym.</p></div>
        <div class="mini-card"><h3>Leverage</h3><p>Premium plate-loaded route. Independent arms, pre-stretch/adjustment features, integrated plate storage and a guided plate-loaded feel for serious strength areas.</p></div>
        <div class="mini-card"><h3>Plate Loaded</h3><p>Traditional full-commercial plate-loaded staples such as leg press, hack squat and other specific strength pieces. Use when the buyer wants plates and a straightforward machine rather than a selectorised stack.</p></div>
        <div class="mini-card"><h3>HumanSport</h3><p>Cable-based, multi-planar functional strength with versatile movement and accessibility. Useful for functional training, varied movement and some rehabilitation/accessibility-led requirements.</p></div>
      </div>
      <div class="callout good"><strong>Fast judgement examples</strong><p>“I want premium selectorised Nautilus” → <strong>Inspiration</strong>. “I want a solid commercial selectorised circuit without chasing the premium look” → <strong>Impact</strong>. “I want plate-loaded/free-weight-style Nautilus machines” → start with <strong>Leverage / Plate Loaded</strong> depending the movement. “I need compact/simple dual stations” → look at <strong>Instinct</strong>, but check the facility is appropriate for light-commercial equipment.</p></div>`},
      {type:'choice',title:'Selectorised range judgement',scenario:'A buyer wants a full-commercial selectorised Nautilus circuit. They care about a premium look, intuitive adjustments and a high-end member experience more than achieving the lowest equipment price.',prompt:'Which line is the best starting point?',options:[
        {text:'Impact because it is plate-loaded.',correct:false,feedback:'Impact is selectorised, but the requirement points more strongly towards the premium Inspiration positioning.'},
        {text:'Inspiration, then narrow the exact machines and configuration.',correct:true,feedback:'Correct. Inspiration is the premium selectorised starting point.'},
        {text:'Instinct because it is always the highest commercial duty range.',correct:false,feedback:'Instinct is the compact/light-commercial line in the warranty matrix.'},
        {text:'HumanSport because every cable machine is premium selectorised.',correct:false,feedback:'HumanSport serves a different functional/multi-planar use case.'}
      ]},
      {type:'choice',title:'Plate-loaded range judgement',scenario:'A gym says, “We want Nautilus machines that use Olympic plates rather than weight stacks. Our serious lifters like independent-arm machines and a free-weight-style feel.”',prompt:'Which route should the rep recognise immediately?',options:[
        {text:'Nautilus Leverage, while checking the exact movements and whether a traditional Plate Loaded piece suits any of them better.',correct:true,feedback:'Correct. Leverage is the obvious premium plate-loaded starting route.'},
        {text:'Inspiration because all premium Nautilus equipment uses plates.',correct:false,feedback:'Inspiration is primarily a selectorised circuit line.'},
        {text:'Instinct because dual-function means free weights.',correct:false,feedback:'Instinct is a compact selectorised circuit line.'},
        {text:'Star Trac 8 Series because the customer said serious lifters.',correct:false,feedback:'Star Trac 8 Series is cardio, not the requested strength route.'}
      ]},
      {type:'brief',title:'Strength commercial classification',html:`<h2>The simple warranty lesson</h2>
      <p class="short-copy">The Core strength matrix groups Nautilus Inspiration, One, EVO, HumanSport, Leverage, Impact, Plate Loaded, XPLOAD, XPLOAD Zone, Multi-Stations, Benches/Racks and Pilates under the strength warranty family. <strong>Instinct is specifically identified as light commercial.</strong></p>
      <p>For reps, the practical rule is more important than memorising every warranty number: know whether you are putting a full-commercial or light-commercial product into the customer’s environment, then verify the exact current warranty wording when the customer needs it.</p>`}
    );

    const quotes=getModule('quotes');
    quotes.summary='Quote confidently when the customer has specified the product or you can justify the recommendation; confirm only the facts that remain outside your knowledge or authority.';
    const quoteFlow=getStep(quotes,'What happens when a quote is needed');
    if(quoteFlow){
      quoteFlow.html=`<h2>When can you quote?</h2>
      <div class="two-col">
        <div class="mini-card"><h3>Exact request</h3><p>If the buyer clearly wants an exact product/configuration and it is suitable for the environment, you can prepare the quote using the approved process.</p></div>
        <div class="mini-card"><h3>Recommended option</h3><p>If the buyer describes the requirement and you know the ranges well enough to be confident the option fits, recommend it, explain why and prepare the quote.</p></div>
      </div>
      <ol class="compact-list">
        <li>Confirm product, quantity and the details that actually affect the choice.</li>
        <li>Build the product quote/schedule yourself when trained on the quote tool.</li>
        <li>Collect delivery/access information early.</li>
        <li>Ask Michael or Sandde only for the genuine confirmations still needed: stock, exact lead time, delivery/install figure, non-standard discount, finance or unusual supplier detail.</li>
        <li>Do not present those unconfirmed items as guaranteed.</li>
        <li>Send/present the quote and continue the customer conversation yourself.</li>
      </ol>`;
    }
    const quoteRequest=getStep(quotes,'A complete quote-support request');
    if(quoteRequest){
      Object.assign(quoteRequest,{type:'choice',title:'Quote it yourself or ask for product help?',scenario:'Tom wants five full-commercial treadmills for a busy gym. He prioritises durability, a substantial running area and normal everyday club use. You know the Star Trac range and have confirmed the quantity, budget and preferred console level.',prompt:'What should happen next?',options:[
        {text:'Tell Tom you need to ask Michael which treadmill range is commercial before discussing a product.',correct:false,feedback:'The rep should already recognise 8 Series as the obvious full-commercial starting point from this requirement.'},
        {text:'Recommend the appropriate 8 Series option, explain why it fits, prepare the product quote, and then obtain any remaining stock/lead-time/delivery confirmation before promising those details.',correct:true,feedback:'Correct. The rep uses product knowledge while protecting unconfirmed fulfilment facts.'},
        {text:'Quote the 10TRx because the most expensive treadmill is always the safest recommendation.',correct:false,feedback:'The customer did not describe a performance-running need.'},
        {text:'Send the entire treadmill catalogue and ask Tom to choose a model unaided.',correct:false,feedback:'The rep should reduce the buyer’s work, not transfer the recommendation task to them.'}
      ]});
    }

    const delivery=getModule('access_delivery');
    removeSteps(delivery,['Build a complete access brief']);
    const deliveryInsert=delivery.steps.findIndex(step=>step.title==='Access mistakes that create cost');
    const deliveryScenarios=[
      {type:'choice',title:'Delivery scenario: straightforward description',scenario:'The customer says, “We are a ground-floor industrial unit. A van can pull right outside the roller shutter and the equipment goes into the main gym just inside. We want delivery and installation.”',prompt:'What should the rep do with that?',options:[
        {text:'Treat delivery and installation as confirmed because the customer called access easy.',correct:false,feedback:'The route sounds favourable, but service scope and physical details still need confirming.'},
        {text:'Ask the customer to fill in a blank internal form by themselves.',correct:false,feedback:'The rep should turn the natural conversation into the access brief.'},
        {text:'Record ground floor, direct unloading and roller-shutter route; confirm address/contact, shutter/threshold, restrictions, exact final position, installation/assembly expectation, pallet removal and any power/anchoring needs, then obtain the delivery/install figure.',correct:true,feedback:'Correct. Use the customer’s description and close the genuine gaps.'},
        {text:'Ignore delivery until after the equipment has been paid for.',correct:false,feedback:'Access can materially affect cost and feasibility.'}
      ]},
      {type:'choice',title:'Delivery scenario: customer says “it will be fine”',scenario:'The customer says, “We are upstairs but there is a lift. We have had machines delivered before. Parking is not really an issue. You come through the front and reception. It should be fine.”',prompt:'Which response shows the best judgement?',options:[
        {text:'Accept full installation access because previous machines were delivered successfully.',correct:false,feedback:'Previous deliveries do not prove this equipment will fit the route.'},
        {text:'Confirm unloading point/restrictions, front entrance and internal widths/corners, lift door and internal dimensions, lift load limit, final room/position, any steps, delivery window and service scope; ask for photos or measurements where the description stays vague.',correct:true,feedback:'Correct. Convert casual language into a usable logistics brief.'},
        {text:'Ask Michael to call the customer and collect all access information.',correct:false,feedback:'Access qualification is a normal rep responsibility.'},
        {text:'Quote kerbside and let the installation crew solve the route on arrival.',correct:false,feedback:'That creates cost and expectation risk.'}
      ]}
    ];
    if(deliveryInsert>=0) delivery.steps.splice(deliveryInsert,0,...deliveryScenarios); else delivery.steps.push(...deliveryScenarios);

    const notes=getModule('notes');
    notes.summary='Use the app outcomes correctly and record the commercial facts that affect the next action.';
    removeSteps(notes,['Choosing the actionable note','Build an actionable opportunity note']);
    notes.steps.splice(1,0,{type:'brief',title:'What the main app outcomes mean at AresFit',html:`<h2>Use the team meaning, not a guess</h2>
      <ul class="compact-list">
        <li><strong>Contacted:</strong> a genuine successful conversation. Record the useful commercial facts and next action.</li>
        <li><strong>NA / No Answer:</strong> the call rang with no answer.</li>
        <li><strong>VM / Voicemail:</strong> voicemail was reached. Record whether you actually left a message; do not imply a message was left if it was not.</li>
        <li><strong>Awaiting Callback:</strong> somebody is expected to call you back but there is no specific agreed time.</li>
        <li><strong>Callback:</strong> there is a real date, time or defined call window for the next contact.</li>
        <li><strong>Provider Reject:</strong> call-provider/number failure outcome when the provider rejects the number or connection.</li>
        <li><strong>Dead Air - AresFit team usage:</strong> use this for a clearly bad/ineligible lead after verification - for example the record is actually a takeaway, unrelated business or there is no genuine gym/facility to contact. The app’s old “silent/dropped call” wording is legacy; NA, VM and Provider Reject already cover normal call-failure outcomes.</li>
      </ul>
      <div class="callout warn"><strong>Verify before killing a lead.</strong><p>Use the Lead Research/Map button to confirm the business/site is genuinely ineligible. Do not mark a valid gym as Dead Air just because the original data is messy.</p></div>`});
    notes.steps.push(
      {type:'choice',title:'Dead Air in the AresFit workflow',scenario:'The lead is named “Best Kebab & Pizza”. The phone answers as a takeaway, the Lead Research/Map view confirms there is no gym at the business or address, and there is no relevant fitness facility to contact.',prompt:'Which outcome fits the team workflow?',options:[
        {text:'Dead Air, with a short factual note that the lead was verified as an ineligible/non-gym business.',correct:true,feedback:'Correct. This is how the AresFit team uses Dead Air.'},
        {text:'VM because the lead is not useful.',correct:false,feedback:'Voicemail describes a call outcome, not lead eligibility.'},
        {text:'Awaiting Callback because somebody answered.',correct:false,feedback:'There is no relevant buyer expected to call.'},
        {text:'HOT because the number is live.',correct:false,feedback:'A live number does not make the business a valid prospect.'}
      ]},
      {type:'choice',title:'Awaiting Callback or Callback?',scenario:'Reception takes your details and says the owner should ring you back, but gives no time and the owner has not agreed a slot.',prompt:'Which outcome best matches?',options:[
        {text:'Callback at 15:00 today.',correct:false,feedback:'No specific time was agreed.'},
        {text:'Contacted - qualified.',correct:false,feedback:'You have not spoken with the decision-maker or qualified a sale.'},
        {text:'Awaiting Callback, with a factual note that details were taken and no time was agreed.',correct:true,feedback:'Correct. Callback is for a real date/time/window.'},
        {text:'No Answer.',correct:false,feedback:'Somebody answered and took details.'}
      ]},
      {type:'choice',title:'Voicemail outcome',scenario:'The call reaches voicemail. You hang up without leaving a message because you plan to retry at a better time.',prompt:'What should the record show?',options:[
        {text:'VM/Voicemail with a truthful no-message record or the approved automatic note.',correct:true,feedback:'Correct. Do not imply the customer received a message.'},
        {text:'Contacted because the voicemail system answered.',correct:false,feedback:'Voicemail is not a buyer conversation.'},
        {text:'Awaiting Callback because the number is valid.',correct:false,feedback:'No callback was agreed.'},
        {text:'DNC because voicemail means they are avoiding you.',correct:false,feedback:'Voicemail and do-not-contact are completely different.'}
      ]}
    );
    flattenTap(notes,'Before saving the note','Before saving the note');

    const serializedModules=modules.map(module=>JSON.stringify(module)).join(',');
    html=html.slice(0,bodyStart)+serializedModules+html.slice(moduleEnd);

    const assessmentStartMarker='const assessmentQuestions=[';
    const assessmentEndMarker='];\n\nfunction freshState';
    const assessmentStart=html.indexOf(assessmentStartMarker);
    const assessmentEnd=html.indexOf(assessmentEndMarker,assessmentStart);
    if(assessmentStart<0||assessmentEnd<0) throw new Error('Could not locate assessment questions.');
    const assessmentBodyStart=assessmentStart+assessmentStartMarker.length;

    const questions=[
      q('Product judgement',5,true,'A busy commercial gym asks for treadmills that are long-lasting, substantial in size and suitable for normal daily club use. They are not asking for elite running technology.','What should the rep recognise first?',['Star Trac 4 Series because it is compact.','Star Trac 10TRx because the top range is always safest.','Star Trac 8 Series as the obvious full-commercial starting point, then narrow the exact model/console.','Tell the buyer you need to ask Michael which Star Trac range is commercial.'],2,'The requirement already points to the normal full-commercial 8 Series route.'),
      q('Quote judgement',5,true,'A buyer has named the exact product and quantity. You know it is suitable and you are trained on the quote tool. Delivery cost is not yet confirmed.','What should happen?',['Prepare the product quote and collect/confirm the delivery information separately before presenting delivery as included.','Ask Michael to rebuild the quote from scratch.','Refuse to quote until every supplier detail in the order is known.','Promise standard delivery and correct it later if necessary.'],0,'A clear product request can be quoted; unconfirmed fulfilment facts remain protected.'),
      q('Nautilus ranges',3,false,'A customer wants a premium full-commercial selectorised Nautilus circuit with a polished look and intuitive adjustments.','Which line is the strongest starting point?',['Impact.','Instinct.','Leverage.','Inspiration.'],3,'Inspiration is the premium selectorised starting point.'),
      q('Nautilus ranges',3,false,'A customer wants Nautilus machines that use Olympic plates, with independent-arm movement and a serious-lifter feel.','Which route should the rep recognise?',['HumanSport.','Leverage, while checking whether any traditional Plate Loaded piece better fits a specific movement.','Instinct.','Star Trac 8 Series.'],1,'Leverage is the obvious premium plate-loaded route.'),
      q('Product discovery',5,true,'A buyer says they need “a leg machine” but gives no movement, loading style, footprint or user requirement.','What is the right next step?',['Quote the first leg machine on the website.','Ask only for the budget.','Clarify the movement, loading style, users, space, traffic and existing line before naming the machine.','Ask Michael to choose a product with no more customer questions.'],2,'The requirement is not yet specific enough to make a defensible recommendation.'),
      q('Gatekeeper',3,false,'Reception says, “We already have equipment.” You have not spoken with the equipment buyer.','What is the best response?',['Acknowledge it and ask who handles future replacements, additions or refurbishments.','Mark the lead uninterested.','Tell reception the equipment is probably old.','Ask for a full asset list.'],0,'Existing equipment is expected and does not answer the future purchasing question.'),
      q('Gatekeeper',5,true,'Reception says, “We already have a supplier, so the owner will not need another.” There is no direct buyer rejection.','What is the strongest move?',['Promise a lower price.','Mark the business dead.','Ask reception to cancel the existing supplier.','Clarify that existing suppliers are normal and ask who handles future replacements, alternatives or overflow purchasing.'],3,'A current supplier is discovery information, not automatic disqualification.'),
      q('Gatekeeper',5,true,'A receptionist says the owner is “not interested,” but does not say the owner personally made that decision and there is no DNC request.','How should the rep treat it?',['Record a confirmed buyer rejection.','Calmly establish whether that is the owner’s actual decision or the gatekeeper’s assumption, then route appropriately.','Argue until the call is transferred.','Call repeatedly from different numbers.'],1,'A gatekeeper assumption is not automatically the buyer’s decision.'),
      q('Gatekeeper',3,false,'Reception says, “Just send an email.” You do not yet know the decision-maker.','What makes the email useful?',['Send the full catalogue to info@ and wait.','Refuse to email.','Confirm the DM name/email, ask one useful planning question if appropriate and establish a follow-up.','Ask reception to choose the equipment.'],2,'The email needs a person, purpose and next action.'),
      q('Stock and lead time',5,true,'A buyer asks whether the quoted equipment is definitely in stock and can be installed next Friday. You have not checked either point.','What should the rep say?',['Yes, because it is on the website.','Probably, but put “subject to confirmation” in small print.','Ask the buyer to contact Sandde directly.','Explain that the equipment can be quoted, but stock, exact lead time and installation date will be confirmed before committing to those details.'],3,'Keep the sale moving without inventing fulfilment facts.'),
      q('Delivery',5,true,'Customer: “Ground-floor industrial unit, van can pull up at the roller shutter, kit goes just inside, and we want installation.”','What should the rep do?',['Treat installation as confirmed.','Record the positive route, then confirm the remaining access/service details and obtain the delivery/install figure.','Send the customer a blank internal form and ask them to work it out.','Ignore access until payment.'],1,'The rep should convert natural customer language into a usable access brief.'),
      q('Delivery',5,true,'Customer: “We are upstairs but there is a lift. Parking is fine and you come through reception. We have had machines before.”','What is the strongest next action?',['Assume the route works because previous machines were delivered.','Quote kerbside and let the crew solve it.','Ask Michael to collect the information.','Confirm unloading, doors/corners, lift dimensions/load, final position, timing and service scope; request photos or measurements where vague.'],3,'Vague access must become measured, usable information.'),
      q('Cardio commercial rating',5,true,'A normal dues-paying commercial gym asks for Star Trac 4 Series because it is cheaper.','What matters?',['The 4 Series is a light-commercial/hospitality route and is marked not intended for commercial use in the commercial warranty column; use an appropriate commercial range instead.','Any treadmill becomes commercial when sold to a gym.','Commercial rating only matters after the warranty claim.','Price decides suitability.'],0,'Duty level must fit the facility before price is considered.'),
      q('Cardio ranges',3,false,'A performance facility wants a premium treadmill specifically for serious runners and values the running feel above budget.','Which range is the strongest starting point?',['4 Series.','6 Series.','10TRx FreeRunner.','S-TRX.'],2,'10TRx is the premium performance-running route.'),
      q('Strength commercial rating',5,true,'A busy dues-paying gym asks for Instinct because it is compact.','What should the rep remember?',['Instinct is always the highest-duty Nautilus selectorised range.','The Core warranty matrix marks Instinct as light commercial, so it is not the default for this environment.','Instinct is plate-loaded.','Commercial duty does not matter if the footprint is small.'],1,'Instinct has a useful compact role but the duty classification matters.'),
      q('Warranty',5,true,'A customer asks for the exact parts/labour warranty on a specific commercial model. You know the product family but do not have the current matrix open.','What should the rep do?',['Give the warranty from memory.','Say every commercial product has the same warranty.','Confirm that the product is commercially suitable, but verify the exact current model/territory/component warranty before stating the numbers.','Tell the customer warranty cannot be discussed.'],2,'Know the duty level; verify exact warranty wording when a precise commitment is requested.'),
      q('Selectorised positioning',3,false,'A buyer wants a dependable full-commercial selectorised circuit but is more focused on proven function and value than premium aesthetics.','Which Nautilus line is a sensible starting point?',['Impact.','Leverage.','HumanSport.','Instinct because it is always full commercial.'],0,'Impact is the straightforward proven commercial selectorised route.'),
      q('HumanSport',3,false,'A facility wants cable-based equipment that supports multi-planar functional movement and accessibility rather than a fixed traditional selectorised circuit.','Which route best fits?',['Inspiration.','Plate Loaded.','HumanSport.','Star Trac 8 Series.'],2,'HumanSport is the cable-based multi-planar functional route.'),
      q('Competitor objection',5,true,'A competitor is £4,000 cheaper, but their quote may use a different console and exclude installation.','What should happen first?',['Promise a £4,000 match.','Tell the buyer the competitor is lower quality.','Compare products, inclusions, warranty, delivery/install and the buyer’s decision condition, then take the complete case for any needed approval.','Remove installation from your quote.'],2,'Diagnose the difference before discounting or changing scope.'),
      q('Discount',5,true,'A buyer says, “Take another 5% off and I will order today.” The rep has no authority for that discount.','What is correct?',['Apply it provisionally.','Confirm that this is genuinely the buying condition, then request approval without promising the outcome.','Offer 3% instead.','Tell them small discounts are automatically approved.'],1,'The rep can diagnose the decision condition but cannot create unauthorised pricing.'),
      q('Finance',5,true,'A gym asks whether finance is guaranteed and what the exact monthly payment will be.','What can the rep safely do?',['Explain finance can be explored, but approval and exact terms/figures depend on the provider and must be confirmed.','Guarantee approval above a certain order value.','Make up an illustrative monthly figure.','Never mention finance.'],0,'Finance can be discussed without guaranteeing approval or figures.'),
      q('Supplier setup',3,false,'A gym has a main supplier but buys emergency replacements elsewhere when lead times are poor.','What does that tell the rep?',['There is no opportunity until the contract ends.','There may be a secondary-supplier opening; qualify categories, triggers, buyer and timing.','Immediately quote a full refit.','Tell them to leave the supplier.'],1,'A supplier relationship can still contain specific gaps.'),
      q('App outcomes',3,false,'Reception takes your details and says the owner should call you back, but no time is agreed.','Which outcome fits?',['Callback at 15:00.','No Answer.','Awaiting Callback with a factual note that no time was agreed.','HOT.'],2,'Awaiting Callback is for an expected return call without a defined time.'),
      q('App outcomes',3,false,'The call reaches voicemail and you leave no message.','What should be recorded?',['VM/Voicemail with a truthful no-message record or the approved auto-note.','Contacted.','Awaiting Callback.','DNC.'],0,'The record should describe what actually happened.'),
      q('Lead eligibility',3,false,'A lead is a takeaway, the phone confirms the business and the Lead Research/Map view confirms there is no gym/facility at the site.','Which team outcome fits?',['VM.','Provider Reject.','Dead Air with a short factual ineligible-lead note.','Awaiting Callback.'],2,'AresFit uses Dead Air for verified bad/ineligible leads.'),
      q('Lead eligibility',5,true,'A lead name looks odd, but the map shows a genuine gym facility at the address.','What should the rep do before using Dead Air?',['Mark it Dead Air because the name looks wrong.','Verify the business/site properly and keep it if it is a real usable prospect.','Delete the row.','Use Provider Reject even though the phone works.'],1,'Dead Air must not become a shortcut for deleting messy but valid leads.'),
      q('Follow-up',3,false,'The board reviews the quote Thursday at 11:00 and the buyer asks you to call afterwards.','What is strongest?',['Set a specific post-meeting callback and record what decision/feedback you expect to discuss.','Wait for them to call.','Call during the meeting repeatedly.','Send a new catalogue instead.'],0,'A good follow-up is tied to a buyer event and has a clear time.'),
      q('DNC',5,true,'A contact says, “Remove us. Do not call or email again.”','What must happen?',['Ask whether six months would be okay.','Try a different employee.','Delete the row so there is no trace.','Record the DNC request, preserve suppression evidence and stop sales contact.'],3,'A clear opt-out ends sales activity.'),
      q('Shopify',5,true,'A trained rep has created the approved quote/draft and sees Shopify’s “Send invoice” action.','What should they do?',['Use it for urgent buyers.','Use it only when delivery is included.','Do not use Send invoice; follow the approved AresFit quote/customer-email process.','Ask the buyer to trigger it.'],2,'Tool access does not change the approved customer-document process.'),
      q('Integrated judgement',5,true,'A gym wants six treadmills and four bikes for a first-floor refit. Budget and users are clear. The buyer says the lift is “big”, asks for a quote today, asks whether everything is in stock and wants a discount because another supplier is cheaper.','Which sequence is strongest?',['Finish the product recommendation yourself, convert the vague access into a proper brief, prepare the quote, compare the competitor scope, then request only stock/lead-time, delivery/install and discount confirmations before promising those points.','Send the entire opportunity to Michael and stop discussing it with the buyer.','Promise stock and a small discount, then collect access after payment.','Quote website totals with free delivery and add “subject to confirmation”.'],0,'The rep should do the rep work and escalate only genuine information/authority gaps.')
    ];
    if(questions.length!==30) throw new Error(`Assessment must contain 30 questions; found ${questions.length}.`);
    html=html.slice(0,assessmentBodyStart)+questions.map(item=>JSON.stringify(item)).join(',')+html.slice(assessmentEnd);

    html=html.replace("b.textContent=adminUnlocked?'Admin ✓':'Admin';","b.textContent=adminUnlocked?'🔓':'🔒';");
    html=html.replace("b.title=adminUnlocked?'Admin review mode is active. Select to lock it again.':'Unlock every course page for review';","b.title=adminUnlocked?'Admin review active — select to lock':'Admin unlock — review every course page';");
    html=html.replace(/AresFit Sales Rep Course v7\.4/g,'AresFit Sales Rep Course v7.6');
    html=html.replace(/AresFit Rep Training v7\.4/g,'AresFit Rep Training v7.6');
    html=html.replace("const VERSION='7.4';","const VERSION='7.6';");

    const checks=[
      'Do not over-question when the answer is already clear',
      'Star Trac range shortcuts',
      'Nautilus range shortcuts',
      'Dead Air - AresFit team usage',
      'Delivery scenario: customer says',
      'AresFit Rep Training v7.6'
    ];
    const missing=checks.filter(marker=>!html.includes(marker));
    if(missing.length) throw new Error(`v7.6 patch failed: ${missing.join(', ')}`);
    if(html.includes("adminUnlocked=localStorage.getItem(ADMIN_KEY)==='1'")) throw new Error('Admin reset patch failed.');
    return html;
  };
})();
