// 잔금 캘린더 계산기 — 잔금일 기준 D-30~잔금 후 기한 계산, .ics 캘린더 내보내기
const S=[
[-30,'대출 은행 2곳 이상 상담·신청','심사에 2~3주 걸려요. 이사업체도 이때 예약하세요.'],
[-21,'관리사무소에 이사 날짜·엘리베이터 예약','보양·엘리베이터 이용료도 같이 확인해요.'],
[-14,'대출 승인 확인 · 실행일 = 잔금일','실행 시간까지 은행에 확인해요. 가스레인지 쓰면 가스 연결 예약.'],
[-7,'잔금·취득세 돈 준비, 이체 한도 올리기','법무사 확정 · 매도인과 관리비·선수관리비 정산 방법 맞추기.'],
[-1,'서류 준비 · 매도인 계좌 명의 확인','계좌번호는 문자만 믿지 말고 등기부상 소유자 명의인지 확인해요.'],
[0,'잔금일','등기부 재발급 → 집 상태 확인 → 송금 → 말소 서류 → 검침 사진 → 열쇠·비밀번호 인계',1],
[14,'전입신고 기한','이사 당일 신고가 가장 안전해요.'],
[60,'취득세 신고·납부 기한','법무사에 맡겼어도 영수증은 꼭 받아 두세요.'],
[90,'생애최초 감면 받았다면 전입 기한','취득일부터 3개월 안에 전입해야 감면이 유지돼요.'],
];
const $=id=>document.getElementById(id),W='일월화수목금토';
function add(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function fmt(x){return `${x.getMonth()+1}/${x.getDate()}(${W[x.getDay()]})`}
function lab(n){return n===0?'D-day':n<0?`D${n}`:`잔금 +${n}일`}
function draw(){const v=$('d').value;if(!v)return;const b=new Date(v+'T00:00:00');
$('list').innerHTML=S.map(([n,t,s,k])=>`<li class="${k?'k':''}"><div class="dt">${lab(n)}<b>${fmt(add(b,n))}</b></div><div class="t">${t}</div><div class="n">${s}</div></li>`).join('')}
const t=new Date();t.setDate(t.getDate()+30);$('d').value=t.toISOString().slice(0,10);
$('d').addEventListener('change',draw);draw();
$('ics').onclick=()=>{const v=$('d').value;if(!v)return;const b=new Date(v+'T00:00:00');const p=x=>String(x).padStart(2,'0');
const ds=x=>`${x.getFullYear()}${p(x.getMonth()+1)}${p(x.getDate())}`;
let s='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//goodsister//jangeum//KO\r\n';
S.forEach(([n,t,d],i)=>{const x=add(b,n),y=add(b,n+1);s+=`BEGIN:VEVENT\r\nUID:jg${i}-${ds(b)}@goodsister\r\nDTSTAMP:${ds(new Date())}T000000Z\r\nDTSTART;VALUE=DATE:${ds(x)}\r\nDTEND;VALUE=DATE:${ds(y)}\r\nSUMMARY:[잔금 ${lab(n)}] ${t}\r\nDESCRIPTION:${d}\r\nEND:VEVENT\r\n`});
s+='END:VCALENDAR\r\n';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s],{type:'text/calendar'}));a.download='잔금캘린더.ics';a.click()};
