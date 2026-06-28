export type ModalContent = {
  kicker: string;
  title: string;
  copy: string;
  facts?: [string, string][];
  bullets?: string[];
};

export class InfoModalController {
  renderBody(info: ModalContent): HTMLElement[] {
    const content: HTMLElement[] = [];

    if (info.facts?.length) {
      const facts = document.createElement('div');
      facts.className = 'modal-facts';
      info.facts.forEach(([label, value]) => {
        const fact = document.createElement('div');
        fact.className = 'modal-fact';
        const factLabel = document.createElement('span');
        factLabel.textContent = label;
        const factValue = document.createElement('strong');
        factValue.textContent = value;
        fact.append(factLabel, factValue);
        facts.append(fact);
      });
      content.push(facts);
    }

    if (info.bullets?.length) {
      const list = document.createElement('ul');
      list.className = 'modal-bullets';
      info.bullets.forEach((bullet) => {
        const item = document.createElement('li');
        item.textContent = bullet;
        list.append(item);
      });
      content.push(list);
    }

    return content;
  }
}
